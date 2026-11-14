using System.Data;
using System.Globalization;
using Dapper;

namespace TsukuyomiFocus.Infrastructure.Persistence;

public sealed class DateOnlyTypeHandler : SqlMapper.TypeHandler<DateOnly>
{
    public override void SetValue(IDbDataParameter parameter, DateOnly value)
    {
        parameter.DbType = DbType.Date;
        parameter.Value = value;
    }

    public override DateOnly Parse(object value) => value switch
    {
        DateOnly d => d,
        DateTime dt => DateOnly.FromDateTime(dt),
        string s => DateOnly.Parse(s, CultureInfo.InvariantCulture),
        _ => throw new InvalidCastException($"Unable to convert {value.GetType()} to DateOnly.")
    };
}
