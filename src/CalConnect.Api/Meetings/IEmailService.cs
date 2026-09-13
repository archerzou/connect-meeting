namespace CalConnect.Api.Meetings;

public interface IEmailService
{
    Task SendMeetingInvitation(Guid userId, Meeting meeting);
}

public class EmailService : IEmailService
{
    public Task SendMeetingInvitation(Guid userId, Meeting meeting)
    {
        return Task.CompletedTask;
    }
}
