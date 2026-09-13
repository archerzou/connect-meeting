namespace CalConnect.Api.Meetings;

public class MeetingPolicy
{
    public TimeSpan MaxDuration { get; set; }
    public TimeSpan MinDuration { get; set; }

    public bool IsValidDuration(TimeSpan duration)
    {
        return duration >= MinDuration && duration <= MaxDuration;
    }
}
