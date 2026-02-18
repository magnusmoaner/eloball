using System;
using System.Collections.Generic;

namespace api.Database;

public partial class PlayerMatch
{
    public int Id { get; set; }

    public int MatchId { get; set; }

    public int PlayerId { get; set; }

    public int Team { get; set; }

    public DateTime CreatedDateTime { get; set; }

    public DateTime UpdatedDateTime { get; set; }

    public virtual Match Match { get; set; } = null!;

    public virtual Player Player { get; set; } = null!;
}
