# CalConnect API

A meeting/calendar management backend built with **ASP.NET Core (.NET 10)** minimal APIs, **PostgreSQL** (EF Core + Npgsql), **Quartz.NET** for background jobs, **FluentEmail** for email, and **OpenTelemetry** for observability.

---

## Background Jobs: Email Verification with Quartz.NET

When a user registers, the verification email is **not** sent inline in the request. Instead it is handed off to a **durable Quartz job** that runs in the background. This keeps the registration request fast and makes email delivery resilient (the job and its triggers are persisted in PostgreSQL, so they survive restarts).

The pattern follows the "durable job + per-request trigger" approach.

### The two building blocks

| Concept | Role |
| --- | --- |
| **Durable Job** | Defined and registered **once** at startup with `StoreDurably()`. It exists in the scheduler even when no trigger is attached, so it can be reused for every registration. |
| **Trigger** | Created **per request**. It says *when* to run the job and carries the data (email + link) via a `JobDataMap`. |

### 1. Define the job (`IJob`)

The job only reads its input from `MergedJobDataMap` and sends the email — it holds no per-user state.

```csharp
// src/CalConnect.Api/Users/Infrastructure/SendVerificationEmailJob.cs
internal sealed class SendVerificationEmailJob(IFluentEmail fluentEmail) : IJob
{
    internal const string Name = nameof(SendVerificationEmailJob);

    public async Task Execute(IJobExecutionContext context)
    {
        JobDataMap jobData = context.MergedJobDataMap;

        string? email = jobData.GetString("Email");
        string? verificationLink = jobData.GetString("VerificationLink");

        await fluentEmail
            .To(email)
            .Subject("Email verification for CalConnect")
            .Body($"To verify your email address <a href='{verificationLink}'>click here</a>", isHtml: true)
            .SendAsync(context.CancellationToken);
    }
}
```

### 2. Register the durable job + persistent store (startup)

Registered once in `Program.cs`. `StoreDurably()` keeps the job alive without a trigger; the persistent store writes jobs/triggers to the `scheduler.qrtz_*` tables in PostgreSQL.

```csharp
// Program.cs
builder.Services.AddQuartz(options =>
{
    options.AddJob<SendVerificationEmailJob>(c => c
        .StoreDurably()                          // job lives in the scheduler with no trigger attached
        .WithIdentity(SendVerificationEmailJob.Name));

    options.UsePersistentStore(persistenceOptions =>
    {
        persistenceOptions.UsePostgres(cfg =>
        {
            cfg.ConnectionString = connectionString;
            cfg.TablePrefix = "scheduler.qrtz_";  // Quartz tables live in the `scheduler` schema
        },
        dataSourceName: "calconnect");

        persistenceOptions.UseProperties = true;
        persistenceOptions.UseNewtonsoftJsonSerializer();
    });
});

builder.Services.AddQuartzHostedService(options => options.WaitForJobsToComplete = true);
```

> The Quartz tables live in the `scheduler` schema. On a fresh database Docker
> Compose loads them automatically via
> [`src/CalConnect.Api/Database/Scripts/create_quartz_schema.sql`](src/CalConnect.Api/Database/Scripts/create_quartz_schema.sql).

### 3. Schedule a trigger per registration

Inside the registration use case, grab a scheduler from `ISchedulerFactory`, build a trigger that targets the durable job by name (`ForJob`), attach the data, and schedule it to run immediately (`StartNow`).

```csharp
// src/CalConnect.Api/Users/RegisterUser.cs (excerpt)
string verificationLink = emailVerificationLinkFactory.Create(verificationToken);

IScheduler scheduler = await schedulerFactory.GetScheduler();

var jobData = new JobDataMap
{
    { "Email", user.Email },
    { "VerificationLink", verificationLink }
};

ITrigger trigger = TriggerBuilder.Create()
    .ForJob(SendVerificationEmailJob.Name)                          // reuse the durable job
    .WithIdentity($"trigger-send-verification-email-{user.Id}")     // unique per user
    .UsingJobData(jobData)                                          // pass email + link
    .StartNow()                                                     // fire immediately
    .Build();

await scheduler.ScheduleJob(trigger);
```

### End-to-end flow

```
POST /users/register
      │
      ▼
RegisterUser.Handle
  1. save User + EmailVerificationToken (1-day expiry)
  2. build verification link  → EmailVerificationLinkFactory
  3. schedule trigger for the durable SendVerificationEmailJob (StartNow)
      │
      ▼
Quartz hosted service picks up the trigger (persisted in PostgreSQL)
      │
      ▼
SendVerificationEmailJob.Execute → FluentEmail sends the email
      │
      ▼
User clicks link → GET /users/verify-email?token=... → marks EmailVerified = true
```

**Why durable + trigger?** The job is defined once and reused; each registration just adds a lightweight trigger carrying its own data. Because both are stored in PostgreSQL, a scheduled email is not lost if the service restarts before it is sent.

---

## API Endpoints

All routes are minimal-API endpoints registered automatically via the `IEndpoint` convention. In development, Swagger UI is available at `/swagger`.

### Users

| Method | Route | Description | Request body |
| --- | --- | --- | --- |
| `POST` | `/users/register` | Register a new user and queue a verification email. | `{ email, firstName, lastName, password }` |
| `GET`  | `/users/verify-email?token={guid}` | Verify an email using the token from the email link. | — (query: `token`) |
| `POST` | `/users/login` | Log in; returns access + refresh tokens. | `{ email, password }` |
| `POST` | `/users/refresh-token` | Exchange a refresh token for a new access token. | `{ refreshToken }` |
| `GET`  | `/users?search={q}` | Search users by name/email (for the participant picker). | — (query: `search`) |
| `GET`  | `/users/{id:guid}` | Get a user by id. | — |
| `PUT`  | `/users/{id:guid}` | Update a user's name/email (`id` must match body `Id`). | `{ id, firstName, lastName, email }` |
| `DELETE` | `/users/{id:guid}/refresh-tokens` | Revoke all refresh tokens for the user. | — |

### Meetings

| Method | Route | Description | Request body |
| --- | --- | --- | --- |
| `GET`    | `/meetings` | List all meetings (ordered by start time). | — |
| `GET`    | `/meetings/{id:guid}` | Get a single meeting (agenda + participants). | — |
| `POST`   | `/meetings` | Create a meeting with participants and agenda items. | `{ title, description, startTime, duration, location, type, participants[], agendaItems[], organizerId }` |
| `PUT`    | `/meetings/{id:guid}` | Update a meeting (`id` must match body `Id`). | meeting fields |
| `PATCH`  | `/meetings/{id:guid}/reschedule` | Reschedule a meeting (`id` must match body `Id`). | `{ id, newStartTime }` |
| `DELETE` | `/meetings/{id:guid}` | Cancel a meeting. | — |
| `POST`   | `/meetings/{id}/participants` | Invite a participant to a meeting. | `{ userId, role }` |
| `DELETE` | `/meetings/{id}/participants/{userId}` | Remove a participant from a meeting. | — |
| `PUT`    | `/meetings/{id}/participants/{userId}/response?response={value}` | Update a participant's RSVP. | — (query: `response`) |

> Enums are serialized as strings (e.g. `"Standard"`, `"Organizer"`, `"Accepted"`) and
> `duration` fields use the `HH:mm:ss` format. Start times are normalized to UTC on write.

---

## Project structure

```
src/
  CalConnect.Api/      ASP.NET Core minimal-API backend
  CalConnect.Web/      React + Vite frontend (built & served by nginx in Docker)
tests/
  CalConnect.UnitTests/
docker-compose.yml     full stack: web + api + postgres + papercut + seq + jaeger
```

## Running Locally

`docker-compose.yml` builds and runs the whole stack (frontend, API, PostgreSQL,
Papercut SMTP catcher, Seq logs, Jaeger traces):

```bash
docker compose up -d --build
```

| Service | URL |
| --- | --- |
| Web app | http://localhost:4173 |
| API + Swagger | http://localhost:5000/swagger |
| Papercut (dev inbox) | http://localhost:8080 |
| Seq (logs) | http://localhost:8081 |
| Jaeger (traces) | http://localhost:16686 |
| PostgreSQL | `localhost:5437` |

Startup is health-gated: Postgres → API (waits for DB healthy, runs EF migrations)
→ Web (waits for API `/health`). On a fresh database the Quartz schema is loaded
automatically. Config defaults live in the compose file; copy `.env.example` to
`.env` to override ports/credentials/JWT.

To run just the API from source (against the compose Postgres):

```bash
dotnet run --project src/CalConnect.Api
```
