using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;
using CalConnect.Api.Users.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Quartz;
using ApplicationException = CalConnect.Api.Exceptions.ApplicationException;

namespace CalConnect.Api.Users;

internal sealed class RegisterUser(
    AppDbContext context,
    PasswordHasher passwordHasher,
    ISchedulerFactory schedulerFactory,
    EmailVerificationLinkFactory emailVerificationLinkFactory)
{
    public sealed record Request(string Email, string FirstName, string LastName, string Password);

    public async Task<User> Handle(Request request)
    {
        if (await context.Users.Exists(request.Email))
        {
            throw new ApplicationException("The email is already in use");
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            PasswordHash = passwordHasher.Hash(request.Password)
        };

        context.Users.Add(user);

        DateTime utcNow = DateTime.UtcNow;
        var verificationToken = new EmailVerificationToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            CreatedOnUtc = utcNow,
            ExpiresOnUtc = utcNow.AddDays(1)
        };

        context.EmailVerificationTokens.Add(verificationToken);

        try
        {
            await context.SaveChangesAsync();
        }
        catch (DbUpdateException e)
            when (e.InnerException is NpgsqlException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            throw new Exception("The email is already in use", e);
        }

        string verificationLink = emailVerificationLinkFactory.Create(verificationToken);

        IScheduler scheduler = await schedulerFactory.GetScheduler();

        var jobData = new JobDataMap
        {
            { "Email", user.Email },
            { "VerificationLink", verificationLink }
        };

        ITrigger trigger = TriggerBuilder.Create()
            .ForJob(SendVerificationEmailJob.Name)
            .WithIdentity($"trigger-send-verification-email-{user.Id}")
            .UsingJobData(jobData)
            .StartNow()
            .Build();

        await scheduler.ScheduleJob(trigger);

        return user;
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("users/register", async (Request request, RegisterUser useCase) =>
                await useCase.Handle(request))
                .WithTags(UserEndpoints.Tag);
        }
    }
}
