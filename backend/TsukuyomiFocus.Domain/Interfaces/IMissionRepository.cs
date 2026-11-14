using System.Data;
using TsukuyomiFocus.Domain.Entities;

namespace TsukuyomiFocus.Domain.Interfaces;

public interface IMissionRepository
{
    Task<Guid?> GetDefaultUserIdAsync(
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        bool forUpdate = false,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Mission>> GetAllByUserAsync(
        Guid userId,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default);

    Task<Mission?> GetByIdAsync(
        Guid id,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default);

    Task<bool> HasActiveAmaterasuOnDateAsync(
        Guid userId,
        DateOnly date,
        Guid? excludeMissionId = null,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default);

    Task<Mission> CreateAsync(
        Mission mission,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default);

    Task<Mission?> UpdateAsync(
        Mission mission,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default);

    Task<Mission?> UpdateStatusAsync(
        Guid id,
        Guid userId,
        string status,
        DateTime? completedAt,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default);

    Task<Mission?> SetAmaterasuAsync(
        Guid id,
        Guid userId,
        bool isAmaterasu,
        DateOnly? amaterasuDate,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(
        Guid id,
        Guid userId,
        IDbConnection? connection = null,
        IDbTransaction? transaction = null,
        CancellationToken cancellationToken = default);
}
