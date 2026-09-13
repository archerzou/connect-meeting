using FluentEmail.Core;
using Quartz;

namespace CalConnect.Api.Users.Infrastructure;

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
