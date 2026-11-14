using Dapper;
using Microsoft.Extensions.DependencyInjection;
using TsukuyomiFocus.Domain.Interfaces;
using TsukuyomiFocus.Infrastructure.Persistence;
using TsukuyomiFocus.Infrastructure.Repositories;

namespace TsukuyomiFocus.Infrastructure;

public static class IoC
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        DefaultTypeMap.MatchNamesWithUnderscores = true;
        SqlMapper.AddTypeHandler(new DateOnlyTypeHandler());

        services.AddSingleton<IDbConnectionFactory, NpgsqlConnectionFactory>();
        services.AddTransient<DatabaseInitializer>();

        services.AddTransient<IProfileRepository, ProfileRepository>();
        services.AddTransient<IMissionRepository, MissionRepository>();
        services.AddTransient<ISessionRepository, SessionRepository>();
        services.AddTransient<IStatsRepository, StatsRepository>();

        return services;
    }
}
