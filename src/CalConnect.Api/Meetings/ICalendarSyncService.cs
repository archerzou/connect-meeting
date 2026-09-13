namespace CalConnect.Api.Meetings;

public interface ICalendarSyncService
{
    Task SyncMeetingToExternalCalendars(Meeting meeting);
}

public class CalendarSyncService : ICalendarSyncService
{
    public Task SyncMeetingToExternalCalendars(Meeting meeting)
    {
        return Task.CompletedTask;
    }
}
