namespace CalConnect.Api.Meetings;

public class MeetingPolicyService
{
    private static readonly Dictionary<MeetingType, MeetingPolicy> Policies = new()
    {
        {
            MeetingType.Standard,
            new MeetingPolicy
            {
                MaxDuration = TimeSpan.FromHours(2),
                MinDuration = TimeSpan.FromMinutes(15)
            }
        },
        {
            MeetingType.Workshop,
            new MeetingPolicy
            {
                MaxDuration = TimeSpan.FromHours(4),
                MinDuration = TimeSpan.FromHours(1)
            }
        },
        {
            MeetingType.DecisionMaking,
            new MeetingPolicy
            {
                MaxDuration = TimeSpan.FromHours(1.5),
                MinDuration = TimeSpan.FromMinutes(30)
            }
        }
    };

    public Task<MeetingPolicy> Get(MeetingType meetingType)
    {
        if (Policies.TryGetValue(meetingType, out MeetingPolicy? policy))
        {
            return Task.FromResult(policy);
        }

        throw new ArgumentException($"No policy defined for meeting type: {meetingType}");
    }
}
