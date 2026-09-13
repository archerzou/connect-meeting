using System.Diagnostics;
using System.Text;
using System.Text.Json.Serialization;
using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;
using CalConnect.Api.Exceptions;
using CalConnect.Api.Extensions;
using CalConnect.Api.Meetings;
using CalConnect.Api.Users;
using CalConnect.Api.Users.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using OpenTelemetry;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Quartz;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails(o =>
{
    o.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Instance = $"{context.HttpContext.Request.Method} {context.HttpContext.Request.Path}";
        context.ProblemDetails.Extensions["requestId"] = context.HttpContext.TraceIdentifier;
        Activity? activity = context.HttpContext.Features.Get<IHttpActivityFeature>()?.Activity;
        context.ProblemDetails.Extensions["traceId"] = activity?.Id;
    };
});
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// Serialize/deserialize enums as their string names (e.g. "Standard", "Accepted").
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGenWithAuth();

string connectionString = builder.Configuration.GetConnectionString("Database")!;
builder.Services.AddDbContext<AppDbContext>(o =>
{
    o.UseNpgsql(connectionString).UseSnakeCaseNamingConvention();
});

builder.Services.AddSingleton<PasswordHasher>();
builder.Services.AddSingleton<TokenProvider>();
builder.Services.AddScoped<EmailVerificationLinkFactory>();

builder.Services.AddHttpContextAccessor();

builder.Services
    .AddFluentEmail(builder.Configuration["Email:SenderEmail"], builder.Configuration["Email:Sender"])
    .AddSmtpSender(builder.Configuration["Email:Host"], builder.Configuration.GetValue<int>("Email:Port"));

builder.Services.AddAuthorization();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.RequireHttpsMetadata = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!)),
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddScoped<RegisterUser>();
builder.Services.AddScoped<LoginUser>();
builder.Services.AddScoped<LoginUserWithRefreshToken>();
builder.Services.AddScoped<RevokeRefreshTokens>();
builder.Services.AddScoped<VerifyEmail>();
builder.Services.AddScoped<GetUser>();
builder.Services.AddScoped<UpdateUser>();
builder.Services.AddScoped<SearchUsers>();

builder.Services.AddScoped<GetMeetings>();
builder.Services.AddScoped<GetMeeting>();
builder.Services.AddScoped<CreateMeeting>();
builder.Services.AddScoped<UpdateMeeting>();
builder.Services.AddScoped<CancelMeeting>();
builder.Services.AddScoped<RescheduleMeeting>();
builder.Services.AddScoped<InviteParticipant>();
builder.Services.AddScoped<RemoveParticipant>();
builder.Services.AddScoped<UpdateParticipantResponse>();

builder.Services.AddScoped<MeetingPolicyService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ICalendarSyncService, CalendarSyncService>();

builder.Services.AddEndpoints();

builder.Logging.AddOpenTelemetry(logging =>
{
    logging.IncludeFormattedMessage = true;
    logging.IncludeScopes = true;
});

builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource.AddService("CalConnect"))
    .WithTracing(tracing =>
    {
        tracing
            .AddHttpClientInstrumentation()
            .AddAspNetCoreInstrumentation()
            .AddNpgsql()
            .AddQuartzInstrumentation();
    })
    .UseOtlpExporter();

builder.Services.AddQuartz(options =>
{
    options.AddJob<SendVerificationEmailJob>(c => c
        .StoreDurably()
        .WithIdentity(SendVerificationEmailJob.Name));

    options.UsePersistentStore(persistenceOptions =>
    {
        persistenceOptions.UsePostgres(cfg =>
        {
            cfg.ConnectionString = connectionString;
            cfg.TablePrefix = "scheduler.qrtz_";
        },
        dataSourceName: "calconnect");

        persistenceOptions.UseProperties = true;

        persistenceOptions.UseNewtonsoftJsonSerializer();
    });
});

builder.Services.AddQuartzHostedService(options => options.WaitForJobsToComplete = true);

WebApplication app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    app.ApplyMigrations();
}

app.MapEndpoints();

// Liveness probe used by the docker-compose healthcheck (anonymous).
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

app.UseExceptionHandler();

app.UseStatusCodePages();

app.UseAuthentication();

app.UseAuthorization();

app.Run();
