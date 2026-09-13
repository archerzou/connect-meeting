using CalConnect.Api.Database;
using CalConnect.Api.Endpoints;
using Microsoft.EntityFrameworkCore;

namespace CalConnect.Api.Users;

internal sealed class SearchUsers(AppDbContext context)
{
    public sealed record UserSummaryResponse(Guid Id, string FirstName, string LastName, string Email);

    public async Task<IReadOnlyCollection<UserSummaryResponse>> Handle(string? search)
    {
        IQueryable<User> query = context.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            string pattern = $"%{search.Trim()}%";
            query = query.Where(u =>
                EF.Functions.ILike(u.Email, pattern) ||
                EF.Functions.ILike(u.FirstName, pattern) ||
                EF.Functions.ILike(u.LastName, pattern));
        }

        return await query
            .OrderBy(u => u.FirstName)
            .ThenBy(u => u.LastName)
            .Take(20)
            .Select(u => new UserSummaryResponse(u.Id, u.FirstName, u.LastName, u.Email))
            .ToListAsync();
    }

    internal sealed class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("users", async (string? search, SearchUsers useCase) =>
                Results.Ok(await useCase.Handle(search)))
                .WithTags(UserEndpoints.Tag)
                .RequireAuthorization();
        }
    }
}
