using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;

namespace CalConnect.Api.Meetings;

internal class UpdateParticipantResponse(AppDbContext context)
{
    public sealed record Request(Guid MeetingId, Guid UserId, ParticipantResponse Response);

    public async Task<bool> HandleAsync(Request request)
    {
        Meeting? meeting = await context.Meetings.FindAsync(request.MeetingId);

        if (meeting is null || !meeting.HasParticipant(request.UserId))
        {
            return false;
        }

        meeting.SetParticipantResponse(request.UserId, request.Response);

        await context.SaveChangesAsync();

        return true;
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPut("/meetings/{id}/participants/{userId}/response",
            async (Guid id, Guid userId, ParticipantResponse response, UpdateParticipantResponse useCase) =>
            {
                bool success = await useCase.HandleAsync(new Request(id, userId, response));

                return success ? Results.Ok() : Results.BadRequest("Failed to update participant response");
            })
            .WithTags(MeetingEndpoints.Tag)
            .RequireAuthorization();
        }
    }
}
