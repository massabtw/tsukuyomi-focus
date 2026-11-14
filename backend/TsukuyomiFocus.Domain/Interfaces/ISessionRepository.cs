using System.Data;
using TsukuyomiFocus.Domain.Entities;

namespace TsukuyomiFocus.Domain.Interfaces;

public interface ISessionRepository
{
    Task<UserProfile?> GetDefaultProfileForUpdateAsync(
        IDbConnection connection,
        IDbTransaction transaction,
        CancellationToken cancellationToken = default);

    Task<UserProfile> UpdateProfileAsync(
        UserProfile profile,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default);

    Task<Mission?> GetMissionByIdAsync(
        Guid userId,
        Guid missionId,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default);

    Task<Mission?> AddMissionProgressAsync(
        Guid missionId,
        int durationMinutes,
        bool markCompleted,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default);

    Task<FocusSessionLog> InsertSessionLogAsync(
        FocusSessionLog log,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default);
}
