using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;
using CalConnect.Api.Users;
using Microsoft.EntityFrameworkCore;
using ApplicationException = CalConnect.Api.Exceptions.ApplicationException;

namespace CalConnect.Api.Meetings;

internal sealed class CreateMeeting(
    AppDbContext context,
    IEmailService emailService,
    ICalendarSyncService calendarSyncService,
    MeetingPolicyService meetingPolicyService)
{
    public sealed record Request(
        string Title,
        string Description,
        DateTime StartTime,
        TimeSpan Duration,
        string Location,
        MeetingType Type,
        List<ParticipantRequest> Participants,
        List<AgendaItemRequest> AgendaItems,
        Guid OrganizerId);

    public sealed record ParticipantRequest(Guid UserId, ParticipantRole Role);
    public sealed record AgendaItemRequest(string Title, TimeSpan Duration);

    public async Task<Guid> Handle(Request request)
    {
        User? organizer = await context.Users.FindAsync(request.OrganizerId);
        if (organizer == null)
        {
            throw new ApplicationException("Organizer not found.");
        }

        MeetingPolicy meetingPolicy = await meetingPolicyService.Get(request.Type);

        var meeting = Meeting.Create(
            request.Title,
            request.Description,
            request.StartTime,
            request.Duration,
            request.Location,
            request.Type,
            meetingPolicy);

        if (await CheckTimeConflicts(organizer.Id, meeting))
        {
            throw new ApplicationException("The organizer has a time conflict with another meeting.");
        }

        meeting.AddParticipant(organizer.Id, ParticipantRole.Organizer);

        foreach (ParticipantRequest participantRequest in request.Participants)
        {
            User? participant = await context.Users.FindAsync(participantRequest.UserId);
            if (participant == null)
            {
                throw new ApplicationException($"Participant with ID {participantRequest.UserId} not found.");
            }

            if (await CheckTimeConflicts(participant.Id, meeting))
            {
                throw new ApplicationException($"Participant {participant.Id} has a time conflict.");
            }

            meeting.AddParticipant(participant.Id, participantRequest.Role);
        }

        foreach (AgendaItemRequest agendaItemRequest in request.AgendaItems)
        {
            meeting.AddAgendaItem(agendaItemRequest.Title, agendaItemRequest.Duration);
        }

        context.Meetings.Add(meeting);
        await context.SaveChangesAsync();

        foreach (Participant participant in meeting.Participants)
        {
            await emailService.SendMeetingInvitation(participant.UserId, meeting);
        }

        await calendarSyncService.SyncMeetingToExternalCalendars(meeting);

        return meeting.Id;
    }

    private async Task<bool> CheckTimeConflicts(Guid userId, Meeting meeting)
    {
        return await context.Meetings
            .Where(m => m.Participants.Any(p => p.UserId == userId))
            .Where(m => m.StartTime < meeting.EndTime && m.EndTime > meeting.StartTime)
            .AnyAsync();
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("meetings", async (Request request, CreateMeeting useCase) =>
            {
                Guid meetingId = await useCase.Handle(request);
                return Results.Created($"/meetings/{meetingId}", meetingId);
            })
            .WithTags(MeetingEndpoints.Tag)
            .RequireAuthorization();
        }
    }
}
