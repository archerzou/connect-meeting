using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;

namespace CalConnect.Api.Meetings;

internal sealed class RemoveParticipant(AppDbContext context)
{
    public sealed record Request(Guid MeetingId, Guid UserId);

    public async Task<bool> HandleAsync(Request request)
    {
        Meeting? meeting = await context.Meetings.FindAsync(request.MeetingId);
        if (meeting is null)
        {
            return false;
        }

        if (!meeting.HasParticipant(request.UserId))
        {
            return false;
        }

        meeting.RemoveParticipant(request.UserId);

        await context.SaveChangesAsync();

        return true;
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapDelete("/meetings/{id}/participants/{userId}", async (Guid id, Guid userId, RemoveParticipant useCase) =>
            {
                bool success = await useCase.HandleAsync(new Request(id, userId));
                return success ? Results.NoContent() : Results.NotFound("Participant not found or could not be removed");
            })
            .WithTags(MeetingEndpoints.Tag)
            .RequireAuthorization();
        }
    }
}
