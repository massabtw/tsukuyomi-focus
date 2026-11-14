using System.Data;
using TsukuyomiFocus.Domain.Entities;

namespace TsukuyomiFocus.Domain.Interfaces;

public interface IProfileRepository
{
    Task<UserProfile?> GetDefaultAsync(CancellationToken cancellationToken = default);

    Task<UserProfile?> GetDefaultForUpdateAsync(
        IDbConnection connection,
        IDbTransaction transaction,
        CancellationToken cancellationToken = default);

    Task UpdateAsync(
        UserProfile profile,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Mission>> GetAllMissionsByUserAsync(
        Guid userId,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FocusSessionLog>> GetRecentLogsByUserAsync(
        Guid userId,
        int limit = 30,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Mission>> GetExpiredAmaterasuMissionsAsync(
        Guid userId,
        DateOnly today,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default);

    Task ClearAmaterasuFlagsAsync(
        IReadOnlyCollection<Guid> missionIds,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default);
}
