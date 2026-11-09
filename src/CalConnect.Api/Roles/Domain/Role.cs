namespace CalConnect.Api.Roles.Domain;

internal sealed class Role
{
    internal const string Admin = "Admin";
    internal const string Member = "Member";
    internal const int AdminId = 1;
    internal const int MemberId = 2;

    public int Id { get; set; }
    public string Name { get; set; }
}
