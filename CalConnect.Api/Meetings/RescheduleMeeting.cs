using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;

namespace CalConnect.Api.Meetings;

internal sealed class RescheduleMeeting(AppDbContext context)
{
    internal sealed record Request(Guid Id, DateTime NewStartTime);

    public async Task<bool> Handle(Request request)
    {
        Meeting? meeting = await context.Meetings.FindAsync(request.Id);

        if (meeting is null)
        {
            return false;
        }

        meeting.StartTime = request.NewStartTime;

        await context.SaveChangesAsync();

        return true;
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPatch("meetings/{id:guid}/reschedule", async (Guid id, Request request, RescheduleMeeting useCase) =>
            {
                if (id != request.Id)
                {
                    return Results.BadRequest("Id in the route must match the Id in the request body");
                }

                bool success = await useCase.Handle(request);
                return success ? Results.NoContent() : Results.NotFound();
            })
            .WithTags(MeetingEndpoints.Tag)
            .RequireAuthorization();
        }
    }
}
