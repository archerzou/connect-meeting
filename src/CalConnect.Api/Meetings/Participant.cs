namespace CalConnect.Api.Meetings;

public class Participant
{
    public Guid UserId { get; set; }
    public ParticipantRole Role { get; set; }
    public ParticipantResponse Response { get; set; }
}
