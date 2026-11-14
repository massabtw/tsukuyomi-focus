using System.Data.Common;

namespace TsukuyomiFocus.Domain.Interfaces;

public interface IDbConnectionFactory
{
    Task<DbConnection> CreateOpenConnectionAsync(CancellationToken cancellationToken = default);
}
