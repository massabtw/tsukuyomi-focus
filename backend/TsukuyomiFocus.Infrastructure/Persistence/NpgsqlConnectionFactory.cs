using System.Data.Common;
using Microsoft.Extensions.Configuration;
using Npgsql;
using TsukuyomiFocus.Domain.Interfaces;

namespace TsukuyomiFocus.Infrastructure.Persistence;

public sealed class NpgsqlConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;

    public NpgsqlConnectionFactory(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var rawConnectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' was not configured.");

        _connectionString = NormalizeConnectionString(rawConnectionString);
    }

    private static string NormalizeConnectionString(string rawConnectionString)
    {
        var trimmed = rawConnectionString.Trim();
        if (!trimmed.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase) &&
            !trimmed.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase))
        {
            return trimmed;
        }

        var uri = new Uri(trimmed);
        var userInfoParts = uri.UserInfo.Split(':', 2);
        var username = userInfoParts.Length > 0 ? Uri.UnescapeDataString(userInfoParts[0]) : string.Empty;
        var password = userInfoParts.Length > 1 ? Uri.UnescapeDataString(userInfoParts[1]) : string.Empty;

        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = Uri.UnescapeDataString(uri.AbsolutePath.Trim('/')),
            Username = username,
            Password = password,
            SslMode = SslMode.Require,
            ChannelBinding = ChannelBinding.Prefer,
            Pooling = true
        };

        if (!string.IsNullOrWhiteSpace(uri.Query))
        {
            var pairs = uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries);
            foreach (var pair in pairs)
            {
                var kv = pair.Split('=', 2);
                var key = Uri.UnescapeDataString(kv[0]).Trim().ToLowerInvariant();
                var value = kv.Length > 1 ? Uri.UnescapeDataString(kv[1]).Trim().ToLowerInvariant() : string.Empty;

                switch (key)
                {
                    case "sslmode":
                        builder.SslMode = value switch
                        {
                            "disable" => SslMode.Disable,
                            "allow" => SslMode.Allow,
                            "prefer" => SslMode.Prefer,
                            "require" => SslMode.Require,
                            "verify-ca" => SslMode.VerifyCA,
                            "verify-full" => SslMode.VerifyFull,
                            _ => builder.SslMode
                        };
                        break;

                    case "channel_binding":
                        builder.ChannelBinding = value switch
                        {
                            "disable" => ChannelBinding.Disable,
                            "prefer" => ChannelBinding.Prefer,
                            "require" => ChannelBinding.Require,
                            _ => builder.ChannelBinding
                        };
                        break;

                    case "pooling":
                        if (bool.TryParse(value, out var pooling))
                        {
                            builder.Pooling = pooling;
                        }
                        break;
                }
            }
        }

        return builder.ConnectionString;
    }

    public async Task<DbConnection> CreateOpenConnectionAsync(CancellationToken cancellationToken = default)
    {
        var connection = new NpgsqlConnection(_connectionString);
        try
        {
            await connection.OpenAsync(cancellationToken);
            return connection;
        }
        catch
        {
            await connection.DisposeAsync();
            throw;
        }
    }
}
