namespace CalConnect.Api.Meetings;

public sealed record MeetingResponse(
    Guid Id,
    string Title,
    string Description,
    DateTime StartTime,
    int DurationMinutes,
    string Location,
    MeetingType Type,
    IReadOnlyCollection<MeetingParticipantResponse> Participants,
    IReadOnlyCollection<MeetingAgendaItemResponse> AgendaItems);

public sealed record MeetingParticipantResponse(Guid UserId, ParticipantRole Role, ParticipantResponse Response);

public sealed record MeetingAgendaItemResponse(string Title, int DurationMinutes);

internal static class MeetingMapper
{
    public static MeetingResponse ToResponse(Meeting meeting) =>
        new(
            meeting.Id,
            meeting.Title,
            meeting.Description,
            meeting.StartTime,
            (int)Math.Round(meeting.Duration.TotalMinutes),
            meeting.Location,
            meeting.Type,
            meeting.Participants
                .Select(p => new MeetingParticipantResponse(p.UserId, p.Role, p.Response))
                .ToList(),
            meeting.AgendaItems
                .Select(a => new MeetingAgendaItemResponse(a.Title, (int)Math.Round(a.Duration.TotalMinutes)))
                .ToList());
}
