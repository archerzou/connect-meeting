using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;
using ApplicationException = CalConnect.Api.Exceptions.ApplicationException;

namespace CalConnect.Api.Meetings;

internal sealed class InviteParticipant(AppDbContext context)
{
    public sealed record Request(Guid MeetingId, Guid UserId, ParticipantRole Role);

    public async Task<bool> HandleAsync(Request request)
    {
        Meeting? meeting = await context.Meetings.FindAsync(request.MeetingId);
        if (meeting == null)
        {
            return false;
        }

        if (meeting.HasParticipant(request.UserId))
        {
            throw new ApplicationException("This person is already a participant.");
        }

        meeting.AddParticipant(request.UserId, request.Role);

        await context.SaveChangesAsync();

        return true;
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("/meetings/{id}/participants", async (Guid id, Request request, InviteParticipant useCase) =>
            {
                bool success = await useCase.HandleAsync(request with { MeetingId = id });
                return success ? Results.Ok() : Results.BadRequest("Failed to invite participant");
            })
            .WithTags(MeetingEndpoints.Tag)
            .RequireAuthorization();
        }
    }
}
