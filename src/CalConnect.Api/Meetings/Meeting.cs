using CalConnect.Api.Exceptions;

namespace CalConnect.Api.Meetings;

public class Meeting
{
    private readonly List<Participant> _participants = [];
    private readonly List<AgendaItem> _agendaItems = [];

    internal Meeting() { }

    public Guid Id { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public TimeSpan Duration { get; set; }
    public string Location { get; set; }
    public MeetingType Type { get; set; }
    public IReadOnlyCollection<AgendaItem> AgendaItems => [.. _agendaItems.ToList()];
    public IReadOnlyCollection<Participant> Participants => [.. _participants.ToList()];

    public static Meeting Create(
        string title,
        string description,
        DateTime startTime,
        TimeSpan duration,
        string location,
        MeetingType type,
        MeetingPolicy meetingPolicy)
    {
        var meeting = new Meeting
        {
            Id = Guid.NewGuid(),
            Title = title,
            Description = description,
            StartTime = startTime,
            EndTime = startTime.Add(duration),
            Duration = duration,
            Location = location,
            Type = type
        };

        if (!(meeting.Duration >= meetingPolicy.MinDuration &&
              meeting.Duration <= meetingPolicy.MaxDuration))
        {
            throw new DomainException($"Invalid meeting duration for {meeting.Type} meeting type.");
        }

        return meeting;
    }

    public void AddAgendaItem(string title, TimeSpan duration)
    {
        TimeSpan totalAgendaDuration = new TimeSpan(_agendaItems.Sum(a => a.Duration.Ticks)) + duration;
        if (totalAgendaDuration > Duration)
        {
            throw new DomainException("Total agenda duration exceeds meeting duration.");
        }

        _agendaItems.Add(new AgendaItem
        {
            Title = title,
            Duration = duration
        });
    }

    public void AddParticipant(Guid userId, ParticipantRole role)
    {
        if (!CanAddParticipantWithRole(role))
        {
            throw new DomainException($"Cannot add participant with role {role} to this meeting type.");
        }

        _participants.Add(new Participant
        {
            UserId = userId,
            Role = role,
            Response = role == ParticipantRole.Organizer ? ParticipantResponse.Accepted : ParticipantResponse.Pending
        });
    }

    public bool HasParticipant(Guid userId) => _participants.Any(p => p.UserId == userId);

    public void RemoveParticipant(Guid userId) => _participants.RemoveAll(p => p.UserId == userId);

    public void SetParticipantResponse(Guid userId, ParticipantResponse response)
    {
        if (_participants.FirstOrDefault(p => p.UserId == userId) is { } participant)
        {
            participant.Response = response;
        }
    }

    private bool CanAddParticipantWithRole(ParticipantRole role)
    {
        // Check if the meeting has reached its maximum capacity
        int maxParticipants = Type switch
        {
            MeetingType.Standard => 20,
            MeetingType.Workshop => 30,
            MeetingType.DecisionMaking => 10,
            _ => throw new InvalidOperationException($"Unknown meeting type: {Type}")
        };

        if (Participants.Count >= maxParticipants)
        {
            return false;
        }

        // Check if the role is allowed for this meeting type
        bool isRoleAllowed = Type switch
        {
            // All roles are allowed in standard meetings
            MeetingType.Standard => true,
            // Decision-makers are not allowed in workshops
            MeetingType.Workshop => role != ParticipantRole.DecisionMaker,
            // Only decision-makers in decision-making meetings
            MeetingType.DecisionMaking => role == ParticipantRole.DecisionMaker,
            _ => throw new InvalidOperationException($"Unknown meeting type: {Type}")
        };

        if (!isRoleAllowed)
        {
            return false;
        }

        // Check if there's already a participant with this role (for unique roles)
        if ((role == ParticipantRole.Organizer || role == ParticipantRole.Facilitator) &&
            Participants.Any(p => p.Role == role))
        {
            return false;
        }

        return true;
    }
}
