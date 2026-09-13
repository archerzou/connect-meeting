using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;

namespace CalConnect.Api.Meetings;

internal sealed class CancelMeeting(AppDbContext context)
{
    public async Task<bool> Handle(Guid meetingId)
    {
        Meeting? meeting = await context.Meetings.FindAsync(meetingId);

        if (meeting is null)
        {
            return false;
        }

        context.Meetings.Remove(meeting);

        await context.SaveChangesAsync();

        return true;
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapDelete("meetings/{id:guid}", async (Guid id, CancelMeeting useCase) =>
            {
                bool success = await useCase.Handle(id);
                return success ? Results.NoContent() : Results.NotFound();
            })
            .WithTags(MeetingEndpoints.Tag)
            .RequireAuthorization();
        }
    }
}
