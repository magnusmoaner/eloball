using System;
using System.Collections.Generic;

namespace api.Database;

public partial class Match
{
    public int Id { get; set; }

    public int PlayerWonId { get; set; }

    public DateTime CreatedDateTime { get; set; }

    public DateTime UpdatedDateTime { get; set; }

    public bool Egg { get; set; }

    public int? SeasonId { get; set; }

    public virtual ICollection<PlayerMatch> PlayerMatches { get; set; } = new List<PlayerMatch>();

    public virtual Season? Season { get; set; }
}
