using System.Text;
using Dapper;
using TsukuyomiFocus.Domain.Entities;
using TsukuyomiFocus.Domain.Interfaces;
using TsukuyomiFocus.Domain.ValueObjects;

namespace TsukuyomiFocus.Infrastructure.Repositories;

public sealed class StatsRepository : IStatsRepository
{
    private const string ProfileSelectColumns = """
        id, username, total_chakra, total_focus_minutes,
        current_eye_stage, equipped_eye_stage, mangekyou_variant,
        custom_eye_image_url, visual_blur_level, current_streak, best_streak,
        last_focus_date, left_eye_blind, right_eye_blind,
        restoration_required_minutes, restoration_progress_minutes,
        last_izanagi_date, total_izanagi_used, last_amaterasu_check_date,
        created_at, updated_at
        """;

    private const string LogSelectColumns = """
        id, user_id, mission_id, mission_title, rank,
        duration_minutes, chakra_earned, was_susanoo_active,
        was_completed, session_date, created_at
        """;

    private readonly IDbConnectionFactory _connectionFactory;

    public StatsRepository(IDbConnectionFactory connectionFactory)
    {
        ArgumentNullException.ThrowIfNull(connectionFactory);
        _connectionFactory = connectionFactory;
    }

    public async Task<UserProfile?> GetDefaultProfileAsync(CancellationToken cancellationToken = default)
    {
        const string sql = $"""
            SELECT {ProfileSelectColumns}
            FROM user_profiles
            ORDER BY created_at ASC
            LIMIT 1;
            """;

        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var command = new CommandDefinition(sql, cancellationToken: cancellationToken);
        return await connection.QueryFirstOrDefaultAsync<UserProfile>(command);
    }

    public async Task<ScrollAggregateCounts> GetScrollAggregateCountsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                COUNT(*)::int AS total_sessions,
                COUNT(*) FILTER (WHERE was_completed = TRUE)::int AS completed_sessions,
                (SELECT COUNT(*)::int
                 FROM missions
                 WHERE user_id = @UserId
                   AND is_amaterasu = TRUE
                   AND status = 'completed') AS amaterasu_missions_completed
            FROM focus_session_logs
            WHERE user_id = @UserId;
            """;

        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var command = new CommandDefinition(
            sql,
            new { UserId = userId },
            cancellationToken: cancellationToken);

        var counts = await connection.QueryFirstOrDefaultAsync<ScrollAggregateCounts>(command);
        return counts ?? new ScrollAggregateCounts();
    }

    public async Task<IReadOnlyList<HeatmapDayAggregate>> GetHeatmapDataAsync(
        Guid userId,
        DateOnly startDate,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                session_date,
                SUM(duration_minutes)::int AS minutes,
                SUM(chakra_earned)::int AS chakra,
                COUNT(*)::int AS sessions
            FROM focus_session_logs
            WHERE user_id = @UserId
              AND was_completed = TRUE
              AND session_date >= @StartDate
            GROUP BY session_date
            ORDER BY session_date ASC;
            """;

        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var command = new CommandDefinition(
            sql,
            new { UserId = userId, StartDate = startDate },
            cancellationToken: cancellationToken);

        var rows = await connection.QueryAsync<HeatmapDayAggregate>(command);
        return rows.AsList();
    }

    public async Task<IReadOnlyList<RankDistributionAggregate>> GetRankDistributionAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                rank,
                COUNT(*)::int AS completed_missions
            FROM missions
            WHERE user_id = @UserId
              AND status = 'completed'
            GROUP BY rank;
            """;

        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var command = new CommandDefinition(
            sql,
            new { UserId = userId },
            cancellationToken: cancellationToken);

        var rows = await connection.QueryAsync<RankDistributionAggregate>(command);
        return rows.AsList();
    }

    public async Task<IReadOnlyList<FocusSessionLog>> GetRecentLogsAsync(
        Guid userId,
        string? rank = null,
        bool? completed = null,
        int limit = 30,
        CancellationToken cancellationToken = default)
    {
        var safeLimit = limit > 0 ? limit : 30;
        var sqlBuilder = new StringBuilder($"""
            SELECT {LogSelectColumns}
            FROM focus_session_logs
            WHERE user_id = @UserId
            """);

        var parameters = new DynamicParameters();
        parameters.Add("UserId", userId);
        parameters.Add("Limit", safeLimit);

        if (!string.IsNullOrWhiteSpace(rank))
        {
            sqlBuilder.AppendLine();
            sqlBuilder.Append("  AND rank = @Rank");
            parameters.Add("Rank", rank.Trim().ToUpperInvariant());
        }

        if (completed.HasValue)
        {
            sqlBuilder.AppendLine();
            sqlBuilder.Append("  AND was_completed = @Completed");
            parameters.Add("Completed", completed.Value);
        }

        sqlBuilder.AppendLine();
        sqlBuilder.Append("ORDER BY created_at DESC LIMIT @Limit;");

        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var command = new CommandDefinition(
            sqlBuilder.ToString(),
            parameters,
            cancellationToken: cancellationToken);

        var rows = await connection.QueryAsync<FocusSessionLog>(command);
        return rows.AsList();
    }
}
