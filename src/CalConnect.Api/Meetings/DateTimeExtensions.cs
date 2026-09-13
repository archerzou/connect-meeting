namespace CalConnect.Api.Meetings;

internal static class DateTimeExtensions
{
    /// <summary>
    /// Normalises a DateTime to UTC so it can be stored in a PostgreSQL
    /// 'timestamp with time zone' column (Npgsql only accepts Kind=Utc).
    /// Unspecified kinds are assumed to already be UTC.
    /// </summary>
    public static DateTime ToUtcSafe(this DateTime value) =>
        value.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(value, DateTimeKind.Utc)
            : value.ToUniversalTime();
}
