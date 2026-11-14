using System.Data;
using Dapper;
using TsukuyomiFocus.Domain.Entities;
using TsukuyomiFocus.Domain.Interfaces;
using TsukuyomiFocus.Domain.ValueObjects;

namespace TsukuyomiFocus.Infrastructure.Repositories;

/// <summary>
/// Repositório Dapper para operações de persistência das missões do Kanban.
/// </summary>
public sealed class MissionRepository : IMissionRepository
{
    private const string MissionColumns = @"
        id,
        user_id,
        title,
        description,
        rank,
        status,
        estimated_minutes,
        completed_minutes,
        completed_cycles,
        is_amaterasu,
        amaterasu_date,
        created_at,
        completed_at";

    private readonly IDbConnectionFactory _connectionFactory;

    public MissionRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
    }

    public Task<Guid?> GetDefaultUserIdAsync(
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        bool forUpdate = false,
        CancellationToken cancellationToken = default)
    {
        var sql = forUpdate
            ? "SELECT id FROM user_profiles ORDER BY created_at ASC LIMIT 1 FOR UPDATE;"
            : "SELECT id FROM user_profiles ORDER BY created_at ASC LIMIT 1;";

        return ExecuteWithConnectionAsync(
            connection,
            conn => conn.QueryFirstOrDefaultAsync<Guid?>(
                new CommandDefinition(sql, transaction: transaction, cancellationToken: cancellationToken)),
            cancellationToken);
    }

    public Task<IReadOnlyList<Mission>> GetAllByUserAsync(
        Guid userId,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        const string sql = $@"
            SELECT {MissionColumns}
            FROM missions
            WHERE user_id = @UserId
            ORDER BY
                is_amaterasu DESC,
                CASE rank
                    WHEN '{LoreRules.Ranks.S}' THEN 5
                    WHEN '{LoreRules.Ranks.A}' THEN 4
                    WHEN '{LoreRules.Ranks.B}' THEN 3
                    WHEN '{LoreRules.Ranks.C}' THEN 2
                    WHEN '{LoreRules.Ranks.D}' THEN 1
                    ELSE 0
                END DESC,
                created_at DESC;";

        return ExecuteWithConnectionAsync<IReadOnlyList<Mission>>(
            connection,
            async conn =>
            {
                var rows = await conn.QueryAsync<Mission>(
                    new CommandDefinition(sql, new { UserId = userId }, transaction: transaction, cancellationToken: cancellationToken));
                return rows.AsList();
            },
            cancellationToken);
    }

    public Task<Mission?> GetByIdAsync(
        Guid id,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        const string sql = $@"
            SELECT {MissionColumns}
            FROM missions
            WHERE id = @Id;";

        return ExecuteWithConnectionAsync(
            connection,
            conn => conn.QuerySingleOrDefaultAsync<Mission>(
                new CommandDefinition(sql, new { Id = id }, transaction: transaction, cancellationToken: cancellationToken)),
            cancellationToken);
    }

    public Task<bool> HasActiveAmaterasuOnDateAsync(
        Guid userId,
        DateOnly date,
        Guid? excludeMissionId = null,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        // Split SQL branch so PostgreSQL never sees an untyped NULL UUID parameter when excludeMissionId is null.
        var sql = excludeMissionId.HasValue
            ? @"
                SELECT EXISTS (
                    SELECT 1
                    FROM missions
                    WHERE user_id = @UserId
                      AND is_amaterasu = TRUE
                      AND amaterasu_date = @Date
                      AND id <> @ExcludeMissionId
                );"
            : @"
                SELECT EXISTS (
                    SELECT 1
                    FROM missions
                    WHERE user_id = @UserId
                      AND is_amaterasu = TRUE
                      AND amaterasu_date = @Date
                );";

        object parameters = excludeMissionId.HasValue
            ? new { UserId = userId, Date = date, ExcludeMissionId = excludeMissionId.Value }
            : new { UserId = userId, Date = date };

        return ExecuteWithConnectionAsync(
            connection,
            conn => conn.ExecuteScalarAsync<bool>(
                new CommandDefinition(
                    sql,
                    parameters,
                    transaction: transaction,
                    cancellationToken: cancellationToken)),
            cancellationToken);
    }

    public Task<Mission> CreateAsync(
        Mission mission,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(mission);

        const string sql = $@"
            INSERT INTO missions (
                id,
                user_id,
                title,
                description,
                rank,
                status,
                estimated_minutes,
                completed_minutes,
                completed_cycles,
                is_amaterasu,
                amaterasu_date,
                created_at,
                completed_at
            )
            VALUES (
                @Id,
                @UserId,
                @Title,
                @Description,
                @Rank,
                @Status,
                @EstimatedMinutes,
                @CompletedMinutes,
                @CompletedCycles,
                @IsAmaterasu,
                @AmaterasuDate,
                @CreatedAt,
                @CompletedAt
            )
            RETURNING {MissionColumns};";

        return ExecuteWithConnectionAsync(
            connection,
            conn => conn.QuerySingleAsync<Mission>(
                new CommandDefinition(sql, mission, transaction: transaction, cancellationToken: cancellationToken)),
            cancellationToken);
    }

    public Task<Mission?> UpdateAsync(
        Mission mission,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(mission);

        const string sql = $@"
            UPDATE missions
            SET
                title = @Title,
                description = @Description,
                rank = @Rank,
                estimated_minutes = @EstimatedMinutes
            WHERE id = @Id AND user_id = @UserId
            RETURNING {MissionColumns};";

        return ExecuteWithConnectionAsync(
            connection,
            conn => conn.QuerySingleOrDefaultAsync<Mission>(
                new CommandDefinition(
                    sql,
                    new
                    {
                        mission.Id,
                        mission.UserId,
                        mission.Title,
                        mission.Description,
                        mission.Rank,
                        mission.EstimatedMinutes
                    },
                    transaction: transaction,
                    cancellationToken: cancellationToken)),
            cancellationToken);
    }

    public Task<Mission?> UpdateStatusAsync(
        Guid id,
        Guid userId,
        string status,
        DateTime? completedAt,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        const string sql = $@"
            UPDATE missions
            SET
                status = @Status,
                completed_at = @CompletedAt
            WHERE id = @Id AND user_id = @UserId
            RETURNING {MissionColumns};";

        return ExecuteWithConnectionAsync(
            connection,
            conn => conn.QuerySingleOrDefaultAsync<Mission>(
                new CommandDefinition(
                    sql,
                    new
                    {
                        Id = id,
                        UserId = userId,
                        Status = status,
                        CompletedAt = completedAt
                    },
                    transaction: transaction,
                    cancellationToken: cancellationToken)),
            cancellationToken);
    }

    public Task<Mission?> SetAmaterasuAsync(
        Guid id,
        Guid userId,
        bool isAmaterasu,
        DateOnly? amaterasuDate,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        const string sql = $@"
            UPDATE missions
            SET
                is_amaterasu = @IsAmaterasu,
                amaterasu_date = @AmaterasuDate
            WHERE id = @Id AND user_id = @UserId
            RETURNING {MissionColumns};";

        return ExecuteWithConnectionAsync(
            connection,
            conn => conn.QuerySingleOrDefaultAsync<Mission>(
                new CommandDefinition(
                    sql,
                    new
                    {
                        Id = id,
                        UserId = userId,
                        IsAmaterasu = isAmaterasu,
                        AmaterasuDate = amaterasuDate
                    },
                    transaction: transaction,
                    cancellationToken: cancellationToken)),
            cancellationToken);
    }

    public Task<bool> DeleteAsync(
        Guid id,
        Guid userId,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default)
    {
        const string sql = @"
            DELETE FROM missions
            WHERE id = @Id AND user_id = @UserId;";

        return ExecuteWithConnectionAsync(
            connection,
            async conn =>
            {
                var affected = await conn.ExecuteAsync(
                    new CommandDefinition(
                        sql,
                        new { Id = id, UserId = userId },
                        transaction: transaction,
                        cancellationToken: cancellationToken));
                return affected > 0;
            },
            cancellationToken);
    }

    private async Task<T> ExecuteWithConnectionAsync<T>(
        IDbConnection? existingConnection,
        Func<IDbConnection, Task<T>> action,
        CancellationToken cancellationToken)
    {
        if (existingConnection is not null)
        {
            return await action(existingConnection);
        }

        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await action(connection);
    }
}
