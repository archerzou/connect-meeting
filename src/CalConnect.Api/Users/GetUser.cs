using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;
using Microsoft.EntityFrameworkCore;

namespace CalConnect.Api.Users;

internal sealed class GetUser(AppDbContext context)
{
    public sealed record UserResponse(Guid Id, string FirstName, string LastName, string Email, bool EmailVerified);

    public async Task<UserResponse?> Handle(Guid userId)
    {
        UserResponse? user = await context.Users
            .Where(u => u.Id == userId)
            .Select(u => new UserResponse(u.Id, u.FirstName, u.LastName, u.Email, u.EmailVerified))
            .SingleOrDefaultAsync();

        return user;
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("users/{id:guid}", async (Guid id, GetUser useCase) =>
            {
                UserResponse? user = await useCase.Handle(id);

                return user is not null ? Results.Ok(user) : Results.NotFound();
            })
            .WithTags(UserEndpoints.Tag)
            .RequireAuthorization();
        }
    }
}
