using System.Data;
using Dapper;
using TsukuyomiFocus.Domain.Entities;
using TsukuyomiFocus.Domain.Interfaces;

namespace TsukuyomiFocus.Infrastructure.Repositories;

public sealed class ProfileRepository : IProfileRepository
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

    private const string MissionSelectColumns = """
        id, user_id, title, description, rank, status,
        estimated_minutes, completed_minutes, completed_cycles,
        is_amaterasu, amaterasu_date, created_at, completed_at
        """;

    private const string LogSelectColumns = """
        id, user_id, mission_id, mission_title, rank,
        duration_minutes, chakra_earned, was_susanoo_active,
        was_completed, session_date, created_at
        """;

    private readonly IDbConnectionFactory _connectionFactory;

    public ProfileRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
    }

    public async Task<UserProfile?> GetDefaultAsync(CancellationToken cancellationToken = default)
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

    public async Task<UserProfile?> GetDefaultForUpdateAsync(
        IDbConnection connection,
        IDbTransaction transaction,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(connection);
        ArgumentNullException.ThrowIfNull(transaction);

        const string sql = $"""
            SELECT {ProfileSelectColumns}
            FROM user_profiles
            ORDER BY created_at ASC
            LIMIT 1
            FOR UPDATE;
            """;

        var command = new CommandDefinition(sql, transaction: transaction, cancellationToken: cancellationToken);
        return await connection.QueryFirstOrDefaultAsync<UserProfile>(command);
    }

    public async Task UpdateAsync(
        UserProfile profile,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(profile);

        const string sql = """
            UPDATE user_profiles
            SET username = @Username,
                total_chakra = @TotalChakra,
                total_focus_minutes = @TotalFocusMinutes,
                current_eye_stage = @CurrentEyeStage,
                equipped_eye_stage = @EquippedEyeStage,
                mangekyou_variant = @MangekyouVariant,
                custom_eye_image_url = @CustomEyeImageUrl,
                visual_blur_level = @VisualBlurLevel,
                current_streak = @CurrentStreak,
                best_streak = @BestStreak,
                last_focus_date = @LastFocusDate,
                left_eye_blind = @LeftEyeBlind,
                right_eye_blind = @RightEyeBlind,
                restoration_required_minutes = @RestorationRequiredMinutes,
                restoration_progress_minutes = @RestorationProgressMinutes,
                last_izanagi_date = @LastIzanagiDate,
                total_izanagi_used = @TotalIzanagiUsed,
                last_amaterasu_check_date = @LastAmaterasuCheckDate,
                updated_at = @UpdatedAt
            WHERE id = @Id;
            """;

        await ExecuteWithConnectionAsync(
            connection,
            async conn =>
            {
                var command = new CommandDefinition(
                    sql,
                    profile,
                    transaction: transaction,
                    cancellationToken: cancellationToken);
                await conn.ExecuteAsync(command);
            },
            cancellationToken);
    }

    public async Task<IReadOnlyList<Mission>> GetAllMissionsByUserAsync(
        Guid userId,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        const string sql = $"""
            SELECT {MissionSelectColumns}
            FROM missions
            WHERE user_id = @UserId
            ORDER BY is_amaterasu DESC,
                     CASE rank
                         WHEN 'S' THEN 5
                         WHEN 'A' THEN 4
                         WHEN 'B' THEN 3
                         WHEN 'C' THEN 2
                         WHEN 'D' THEN 1
                         ELSE 0
                     END DESC,
                     created_at DESC;
            """;

        return await ExecuteWithConnectionAsync(
            connection,
            async conn =>
            {
                var command = new CommandDefinition(
                    sql,
                    new { UserId = userId },
                    transaction: transaction,
                    cancellationToken: cancellationToken);
                var rows = await conn.QueryAsync<Mission>(command);
                return (IReadOnlyList<Mission>)rows.AsList();
            },
            cancellationToken);
    }

    public async Task<IReadOnlyList<FocusSessionLog>> GetRecentLogsByUserAsync(
        Guid userId,
        int limit = 30,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        var safeLimit = limit > 0 ? limit : 30;

        const string sql = $"""
            SELECT {LogSelectColumns}
            FROM focus_session_logs
            WHERE user_id = @UserId
            ORDER BY created_at DESC
            LIMIT @Limit;
            """;

        return await ExecuteWithConnectionAsync(
            connection,
            async conn =>
            {
                var command = new CommandDefinition(
                    sql,
                    new { UserId = userId, Limit = safeLimit },
                    transaction: transaction,
                    cancellationToken: cancellationToken);
                var rows = await conn.QueryAsync<FocusSessionLog>(command);
                return (IReadOnlyList<FocusSessionLog>)rows.AsList();
            },
            cancellationToken);
    }

    public async Task<IReadOnlyList<Mission>> GetExpiredAmaterasuMissionsAsync(
        Guid userId,
        DateOnly today,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        const string sql = $"""
            SELECT {MissionSelectColumns}
            FROM missions
            WHERE user_id = @UserId
              AND is_amaterasu = TRUE
              AND status <> 'completed'
              AND amaterasu_date < @Today
            ORDER BY created_at ASC;
            """;

        return await ExecuteWithConnectionAsync(
            connection,
            async conn =>
            {
                var command = new CommandDefinition(
                    sql,
                    new { UserId = userId, Today = today },
                    transaction: transaction,
                    cancellationToken: cancellationToken);
                var rows = await conn.QueryAsync<Mission>(command);
                return (IReadOnlyList<Mission>)rows.AsList();
            },
            cancellationToken);
    }

    public async Task ClearAmaterasuFlagsAsync(
        IReadOnlyCollection<Guid> missionIds,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        if (missionIds is null || missionIds.Count == 0)
        {
            return;
        }

        const string sql = """
            UPDATE missions
            SET is_amaterasu = FALSE,
                amaterasu_date = NULL
            WHERE id = ANY(@MissionIds);
            """;

        await ExecuteWithConnectionAsync(
            connection,
            async conn =>
            {
                var command = new CommandDefinition(
                    sql,
                    new { MissionIds = missionIds.ToArray() },
                    transaction: transaction,
                    cancellationToken: cancellationToken);
                await conn.ExecuteAsync(command);
            },
            cancellationToken);
    }

    private async Task<T> ExecuteWithConnectionAsync<T>(
        IDbConnection? connection,
        Func<IDbConnection, Task<T>> action,
        CancellationToken cancellationToken)
    {
        if (connection is not null)
        {
            return await action(connection);
        }

        await using var ownedConnection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await action(ownedConnection);
    }

    private async Task ExecuteWithConnectionAsync(
        IDbConnection? connection,
        Func<IDbConnection, Task> action,
        CancellationToken cancellationToken)
    {
        if (connection is not null)
        {
            await action(connection);
            return;
        }

        await using var ownedConnection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        await action(ownedConnection);
    }
}
