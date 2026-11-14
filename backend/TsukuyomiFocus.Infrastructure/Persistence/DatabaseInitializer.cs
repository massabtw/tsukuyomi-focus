using System.Data;
using Dapper;
using Microsoft.Extensions.Logging;
using TsukuyomiFocus.Domain.Interfaces;
using TsukuyomiFocus.Domain.ValueObjects;

namespace TsukuyomiFocus.Infrastructure.Persistence;

public sealed class DatabaseInitializer
{
    private const string SchemaRelativeFolder = "sql";
    private const string SchemaFileName = "001_init_schema.sql";

    private readonly IDbConnectionFactory _connectionFactory;
    private readonly ILogger<DatabaseInitializer> _logger;

    public DatabaseInitializer(
        IDbConnectionFactory connectionFactory,
        ILogger<DatabaseInitializer> logger)
    {
        ArgumentNullException.ThrowIfNull(connectionFactory);
        ArgumentNullException.ThrowIfNull(logger);

        _connectionFactory = connectionFactory;
        _logger = logger;
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        var schemaPath = ResolveSchemaPath();
        var schemaSql = await File.ReadAllTextAsync(schemaPath, cancellationToken);

        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        await connection.ExecuteAsync(new CommandDefinition(
            schemaSql,
            transaction: transaction,
            cancellationToken: cancellationToken));

        var profileCount = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            "SELECT COUNT(*) FROM user_profiles;",
            transaction: transaction,
            cancellationToken: cancellationToken));

        if (profileCount == 0)
        {
            await SeedInitialDataAsync(connection, transaction, cancellationToken);
            _logger.LogInformation("Database initialized and seeded with default Uchiha profile, missions, and session logs.");
        }
        else
        {
            _logger.LogInformation("Database schema verified; existing user profile detected.");
        }

        await transaction.CommitAsync(cancellationToken);
    }

    private static string ResolveSchemaPath()
    {
        var baseDirPath = Path.Combine(AppContext.BaseDirectory, SchemaRelativeFolder, SchemaFileName);
        if (File.Exists(baseDirPath))
        {
            return baseDirPath;
        }

        var currentDirPath = Path.Combine(Directory.GetCurrentDirectory(), SchemaRelativeFolder, SchemaFileName);
        if (File.Exists(currentDirPath))
        {
            return currentDirPath;
        }

        throw new FileNotFoundException("SQL initialization script not found.", baseDirPath);
    }

    private static async Task SeedInitialDataAsync(
        IDbConnection connection,
        IDbTransaction transaction,
        CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var yesterday = today.AddDays(-1);
        var twoDaysAgo = today.AddDays(-2);
        var userId = Guid.NewGuid();

        const string insertProfileSql = """
            INSERT INTO user_profiles (
                id, username, total_chakra, total_focus_minutes,
                current_eye_stage, equipped_eye_stage, mangekyou_variant,
                visual_blur_level, current_streak, best_streak, last_focus_date,
                left_eye_blind, right_eye_blind, restoration_required_minutes,
                restoration_progress_minutes, total_izanagi_used, last_amaterasu_check_date
            )
            VALUES (
                @Id, 'Uchiha', 1608, 110,
                @EyeStage, @EyeStage, @Variant,
                0, 3, 3, @Today,
                FALSE, FALSE, 180,
                0, 0, @Today
            );
            """;

        await connection.ExecuteAsync(new CommandDefinition(
            insertProfileSql,
            new
            {
                Id = userId,
                EyeStage = LoreRules.EyeStages.Tomoe1,
                Variant = LoreRules.MangekyouVariants.Itachi,
                Today = today
            },
            transaction: transaction,
            cancellationToken: cancellationToken));

        var rankSMissionId = Guid.NewGuid();
        var rankAMissionId = Guid.NewGuid();
        var rankBMissionId = Guid.NewGuid();
        var rankDMissionId = Guid.NewGuid();

        const string insertMissionSql = """
            INSERT INTO missions (
                id, user_id, title, description, rank, status,
                estimated_minutes, completed_minutes, completed_cycles,
                is_amaterasu, amaterasu_date, created_at, completed_at
            )
            VALUES (
                @Id, @UserId, @Title, @Description, @Rank, @Status,
                @EstimatedMinutes, @CompletedMinutes, @CompletedCycles,
                @IsAmaterasu, @AmaterasuDate, @CreatedAt, @CompletedAt
            );
            """;

        var now = DateTime.UtcNow;

        var seedMissions = new[]
        {
            new
            {
                Id = rankSMissionId,
                UserId = userId,
                Title = "Dominar o Tsukuyomi: Arquitetura Deep Work",
                Description = "Sessão crítica de concentração absoluta sem interrupções.",
                Rank = LoreRules.Ranks.S,
                Status = LoreRules.MissionStatuses.Todo,
                EstimatedMinutes = 90,
                CompletedMinutes = 0,
                CompletedCycles = 0,
                IsAmaterasu = true,
                AmaterasuDate = (DateOnly?)today,
                CreatedAt = now.AddHours(-6),
                CompletedAt = (DateTime?)null
            },
            new
            {
                Id = rankAMissionId,
                UserId = userId,
                Title = "Treinamento Mangekyou: Refatoração & Performance",
                Description = "Eliminar gargalos críticos e revisar contratos da aplicação.",
                Rank = LoreRules.Ranks.A,
                Status = LoreRules.MissionStatuses.InTsukuyomi,
                EstimatedMinutes = 75,
                CompletedMinutes = 0,
                CompletedCycles = 0,
                IsAmaterasu = false,
                AmaterasuDate = (DateOnly?)null,
                CreatedAt = now.AddDays(-1),
                CompletedAt = (DateTime?)null
            },
            new
            {
                Id = rankBMissionId,
                UserId = userId,
                Title = "Decifrar a Tábua de Pedra do Santuário Naka",
                Description = "Estudar documentação técnica e mapear próximos entregáveis.",
                Rank = LoreRules.Ranks.B,
                Status = LoreRules.MissionStatuses.Todo,
                EstimatedMinutes = 50,
                CompletedMinutes = 50,
                CompletedCycles = 1,
                IsAmaterasu = false,
                AmaterasuDate = (DateOnly?)null,
                CreatedAt = now.AddDays(-1),
                CompletedAt = (DateTime?)null
            },
            new
            {
                Id = rankDMissionId,
                UserId = userId,
                Title = "Calibrar Kunais e Organizar o Pergaminho",
                Description = "Limpeza de backlog, notas diárias e preparação do ambiente.",
                Rank = LoreRules.Ranks.D,
                Status = LoreRules.MissionStatuses.Completed,
                EstimatedMinutes = 25,
                CompletedMinutes = 25,
                CompletedCycles = 1,
                IsAmaterasu = false,
                AmaterasuDate = (DateOnly?)null,
                CreatedAt = now.AddDays(-2),
                CompletedAt = (DateTime?)now.AddDays(-2).AddMinutes(25)
            }
        };

        await connection.ExecuteAsync(new CommandDefinition(
            insertMissionSql,
            seedMissions,
            transaction: transaction,
            cancellationToken: cancellationToken));

        const string insertLogSql = """
            INSERT INTO focus_session_logs (
                id, user_id, mission_id, mission_title, rank,
                duration_minutes, chakra_earned, was_susanoo_active,
                was_completed, session_date, created_at
            )
            VALUES (
                @Id, @UserId, @MissionId, @MissionTitle, @Rank,
                @DurationMinutes, @ChakraEarned, @WasSusanooActive,
                @WasCompleted, @SessionDate, @CreatedAt
            );
            """;

        var seedLogs = new[]
        {
            new
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                MissionId = (Guid?)rankDMissionId,
                MissionTitle = "Calibrar Kunais e Organizar o Pergaminho",
                Rank = LoreRules.Ranks.D,
                DurationMinutes = 25,
                ChakraEarned = 250,
                WasSusanooActive = false,
                WasCompleted = true,
                SessionDate = twoDaysAgo,
                CreatedAt = now.AddDays(-2)
            },
            new
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                MissionId = (Guid?)null,
                MissionTitle = "Patrulha Noturna no Distrito Uchiha",
                Rank = LoreRules.Ranks.C,
                DurationMinutes = 35,
                ChakraEarned = 420,
                WasSusanooActive = false,
                WasCompleted = true,
                SessionDate = yesterday,
                CreatedAt = now.AddDays(-1).AddHours(-3)
            },
            new
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                MissionId = (Guid?)rankAMissionId,
                MissionTitle = "Treinamento Mangekyou: Refatoração & Performance",
                Rank = LoreRules.Ranks.A,
                DurationMinutes = 10,
                ChakraEarned = 0,
                WasSusanooActive = false,
                WasCompleted = false,
                SessionDate = yesterday,
                CreatedAt = now.AddDays(-1).AddHours(-1)
            },
            new
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                MissionId = (Guid?)rankBMissionId,
                MissionTitle = "Decifrar a Tábua de Pedra do Santuário Naka",
                Rank = LoreRules.Ranks.B,
                DurationMinutes = 50,
                ChakraEarned = 938,
                WasSusanooActive = true,
                WasCompleted = true,
                SessionDate = today,
                CreatedAt = now.AddHours(-2)
            }
        };

        await connection.ExecuteAsync(new CommandDefinition(
            insertLogSql,
            seedLogs,
            transaction: transaction,
            cancellationToken: cancellationToken));
    }
}
