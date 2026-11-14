using System.Data;
using Dapper;
using TsukuyomiFocus.Domain.Entities;
using TsukuyomiFocus.Domain.Interfaces;
using TsukuyomiFocus.Domain.ValueObjects;

namespace TsukuyomiFocus.Infrastructure.Repositories;

public sealed class SessionRepository : ISessionRepository
{
    private const string ProfileColumns = @"
        id, username, total_chakra, total_focus_minutes,
        current_eye_stage, equipped_eye_stage, mangekyou_variant, custom_eye_image_url,
        visual_blur_level, current_streak, best_streak, last_focus_date,
        left_eye_blind, right_eye_blind, restoration_required_minutes,
        restoration_progress_minutes, last_izanagi_date, total_izanagi_used,
        last_amaterasu_check_date, created_at, updated_at";

    private const string MissionColumns = @"
        id, user_id, title, description, rank, status,
        estimated_minutes, completed_minutes, completed_cycles,
        is_amaterasu, amaterasu_date, created_at, completed_at";

    private const string SessionLogColumns = @"
        id, user_id, mission_id, mission_title, rank,
        duration_minutes, chakra_earned, was_susanoo_active,
        was_completed, session_date, created_at";

    private readonly IDbConnectionFactory _connectionFactory;

    public SessionRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
    }

    public async Task<UserProfile?> GetDefaultProfileForUpdateAsync(
        IDbConnection connection,
        IDbTransaction transaction,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(connection);
        ArgumentNullException.ThrowIfNull(transaction);

        var sql = $@"
            SELECT {ProfileColumns}
            FROM user_profiles
            ORDER BY created_at ASC
            LIMIT 1
            FOR UPDATE;";

        return await connection.QueryFirstOrDefaultAsync<UserProfile>(
            new CommandDefinition(sql, transaction: transaction, cancellationToken: cancellationToken));
    }

    public Task<UserProfile> UpdateProfileAsync(
        UserProfile profile,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(profile);

        var sql = $@"
            UPDATE user_profiles
            SET
                total_chakra = @TotalChakra,
                total_focus_minutes = @TotalFocusMinutes,
                current_eye_stage = @CurrentEyeStage,
                equipped_eye_stage = @EquippedEyeStage,
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
                updated_at = NOW()
            WHERE id = @Id
            RETURNING {ProfileColumns};";

        return ExecuteWithConnectionAsync(
            connection,
            transaction,
            (conn, tx) => conn.QuerySingleAsync<UserProfile>(
                new CommandDefinition(sql, profile, transaction: tx, cancellationToken: cancellationToken)),
            cancellationToken);
    }

    public Task<Mission?> GetMissionByIdAsync(
        Guid userId,
        Guid missionId,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        var lockClause = transaction is not null ? "\nFOR UPDATE" : string.Empty;
        var sql = $@"
            SELECT {MissionColumns}
            FROM missions
            WHERE id = @MissionId AND user_id = @UserId{lockClause};";

        return ExecuteWithConnectionAsync(
            connection,
            transaction,
            (conn, tx) => conn.QueryFirstOrDefaultAsync<Mission>(
                new CommandDefinition(
                    sql,
                    new { MissionId = missionId, UserId = userId },
                    transaction: tx,
                    cancellationToken: cancellationToken)),
            cancellationToken);
    }

    public Task<Mission?> AddMissionProgressAsync(
        Guid missionId,
        int durationMinutes,
        bool markCompleted,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        var sql = $@"
            UPDATE missions
            SET
                completed_minutes = completed_minutes + @DurationMinutes,
                completed_cycles = completed_cycles + 1,
                status = CASE WHEN @MarkCompleted THEN @CompletedStatus ELSE status END,
                completed_at = CASE WHEN @MarkCompleted THEN COALESCE(completed_at, NOW()) ELSE completed_at END
            WHERE id = @MissionId
            RETURNING {MissionColumns};";

        var parameters = new
        {
            MissionId = missionId,
            DurationMinutes = durationMinutes,
            MarkCompleted = markCompleted,
            CompletedStatus = LoreRules.MissionStatuses.Completed
        };

        return ExecuteWithConnectionAsync(
            connection,
            transaction,
            (conn, tx) => conn.QuerySingleOrDefaultAsync<Mission>(
                new CommandDefinition(sql, parameters, transaction: tx, cancellationToken: cancellationToken)),
            cancellationToken);
    }

    public Task<FocusSessionLog> InsertSessionLogAsync(
        FocusSessionLog log,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(log);

        var sql = $@"
            INSERT INTO focus_session_logs (
                id, user_id, mission_id, mission_title, rank,
                duration_minutes, chakra_earned, was_susanoo_active,
                was_completed, session_date, created_at
            )
            VALUES (
                @Id, @UserId, @MissionId, @MissionTitle, @Rank,
                @DurationMinutes, @ChakraEarned, @WasSusanooActive,
                @WasCompleted, @SessionDate, @CreatedAt
            )
            RETURNING {SessionLogColumns};";

        return ExecuteWithConnectionAsync(
            connection,
            transaction,
            (conn, tx) => conn.QuerySingleAsync<FocusSessionLog>(
                new CommandDefinition(sql, log, transaction: tx, cancellationToken: cancellationToken)),
            cancellationToken);
    }

    private async Task<T> ExecuteWithConnectionAsync<T>(
        IDbConnection? connection,
        IDbTransaction? transaction,
        Func<IDbConnection, IDbTransaction?, Task<T>> action,
        CancellationToken cancellationToken)
    {
        if (connection is not null)
        {
            return await action(connection, transaction);
        }

        if (transaction is not null)
        {
            throw new ArgumentException("A connection must be provided when a transaction is supplied.", nameof(connection));
        }

        await using var ownedConnection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await action(ownedConnection, null);
    }
}
