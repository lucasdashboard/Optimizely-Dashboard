function Chart(g) {
    this.width = window.innerWidth / 4;
    this.height = window.innerWidth / 4;
    this.outerRadius = Math.min(this.width, this.height) * .5 - 20;
    this.innerRadius = this.outerRadius * .6;

    this.n = g;
    this.data = d3.range(this.n).map(Math.random);
    this.olddata = d3.range(this.n).map(Math.random);

    color = d3.scale.category20();

    this.arc = d3.svg.arc();

    this.pie = d3.layout.pie()
        .sort(null);

    this.svg = d3.select("#project-chart").append("svg")
        .attr("width", this.width)
        .attr("height", this.height);

    this.svg.selectAll(".arc")
        .data(this.arcs(this.data, this.olddata))
        .enter().append("g")
        .attr("class", "arc")
        .attr("transform", "translate(" + this.width / 2 + "," + this.height / 2 + ")")
        .append("path")
        .attr("d", this.arc)
        .attr("fill", function (d, i) {
        return color(i);
    });

    this.transition(this.data);

}

Chart.prototype.newData = function (data) {
    this.n = data.length;
    this.data = data;
    this.olddata = d3.range(this.n).map(Math.random);
    this.svg.remove();
    this.svg = d3.select("#project-chart").append("svg").attr("width", this.width).attr("height", this.height);

    this.svg.selectAll(".arc")
        .data(this.arcs(this.data, this.olddata))
        .enter().append("g")
        .attr("class", "arc")
        .attr("transform", "translate(" + this.width / 2 + "," + this.height / 2 + ")")
        .append("path")
        .attr("d", this.arc)
        .attr("fill", function (d, i) {
        return color(i);
    });

    this.transition(this.data);
}

Chart.prototype.tweenArc = function (b, arcg) {
    return function (a, i) {
        var d = b.call(this, a, i),
            i = d3.interpolate(a, d);
        for (var k in d) a[k] = d[k]; // update data
        return function (t) {
            return arcg(i(t));
        };
    };
}

Chart.prototype.arcs = function (data0, data1) {
    var arcs0 = this.pie(data0),
        arcs1 = this.pie(data1),
        i = -1,
        arc;
    while (++i < this.n) {
        arc = arcs0[i];
        arc.innerRadius = window.innerWidth / 4;
        arc.outerRadius = this.outerRadius;
        arc.next = arcs1[i];
    }
    return arcs0;
}


Chart.prototype.transition = function (data) {

    outerRadius = Math.min(this.width, this.height) * .5 - 20;
    innerRadius = this.outerRadius * .6;
    var path = d3.selectAll(".arc > path")
        .data(this.arcs(this.olddata, data));

    // Wedges split into two rings.
    var t0 = path.transition()
        .duration(1000)
        .attrTween("d", this.tweenArc(function (d, i) {
        return {
            innerRadius: i & 1 ? innerRadius : (innerRadius + outerRadius) / 2,
            outerRadius: i & 1 ? (innerRadius + outerRadius) / 2 : outerRadius
        };
    }, this.arc));

    // Wedges translate to be centered on their final position.
    var t1 = t0.transition()
        .attrTween("d", this.tweenArc(function (d, i) {
        var a0 = d.next.startAngle + d.next.endAngle,
            a1 = d.startAngle - d.endAngle;
        return {
            startAngle: (a0 + a1) / 2,
            endAngle: (a0 - a1) / 2
        };
    }, this.arc));

    // Wedges then update their values, changing size.
    var t2 = t1.transition()
        .attrTween("d", this.tweenArc(function (d, i) {
        return {
            startAngle: d.next.startAngle,
            endAngle: d.next.endAngle
        };
    }, this.arc));

    // Wedges reunite into a single ring.
    var t3 = t2.transition()
        .attrTween("d", this.tweenArc(function (d, i) {
        return {
            innerRadius: innerRadius,
            outerRadius: outerRadius
        };
    }, this.arc));

}
