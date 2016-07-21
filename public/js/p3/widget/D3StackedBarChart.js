define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/dom", "dojo/dom-class", "dojo/dom-construct", "dojo/query!css3", "dojo/dom-style", "dojo/on",
	"d3/d3",
	"dojo/text!./templates/D3StackedBarChart.html"
], function(declare, lang,
			dom, domClass, domConstruct, domQuery, domStyle, on,
			d3,
			Template){

	return declare([], {
		data: null,
		templateString: Template,

		constructor: function(target){
			this.node = domConstruct.place(this.templateString, target, "only");

			this.currentSort = "label";
			this.ascendSort = true;
			this.normalize = false;

			this.drawTargetParams = {
				target: this.node,
				margins: [10, 0, 0, 30]
			};
			const drawTarget = this.prepareSVGDrawTarget(this.drawTargetParams);
			this.chart = drawTarget.chart;
			this.canvas = drawTarget.canvas;
			this.canvasSize = drawTarget.canvas_size;

			const self = this;
			const scaleToggle = domQuery(".chart-wrapper .scale li");
			const sortToggle = domQuery(".chart-wrapper .sort li");

			// Set up the scale toggle
			if(scaleToggle != null){
				scaleToggle.on('click', function(evt){
					scaleToggle.removeClass("active");
					self.normalize = evt.srcElement.className === "normalize";
					domClass.add(evt.srcElement, "active");

					self.scale(function(){
						return self.sort();
					});
				});
			}

			// Set up the sort controls
			if(sortToggle != null){
				sortToggle.on('click', function(evt){
					sortToggle.removeClass("active");
					domClass.add(evt.srcElement, "active");

					return self.sort();
				});
			}
		},

		processData: function(data){

			this.data = data.map((d, i) => ({
				"index": i,
				"label": d.label,
				"total": parseInt(d.total),
				"dist": d.dist,
				"phenotypes": d.phenotypes
			}));
		},

		render: function(){

			// remove existing bars and yAxis
			d3.select("g.y").remove();
			d3.selectAll("g.bar").remove();

			// reset scale params
			this.normalize = domQuery(".chart-wrapper .scale .active")[0].className.split(" ")[0] === "normalize" || false;
			if(this.normalize){
				this.maxValue = 100;
			}else{
				this.maxValue = this.data.map((d) => d.total || 0)
					.reduce((a, b) => Math.max(a, b));
			}

			// reset sort condition
			const sortToggle = domQuery(".chart-wrapper .sort li");
			sortToggle.removeClass("active");
			domClass.add(domQuery(".chart-wrapper .sort .label")[0], "active");

			// axis
			this.pf_y_scale = d3.scale.linear().range([0, this.canvasSize.height]).domain([this.maxValue, 0]);
			this.pf_x_scale = d3.scale.linear().range([0, this.canvasSize.width]).domain([0, this.data.length]);

			// draw bars
			this.canvas.selectAll("g.bar").data(this.data).enter().append("g").attr("class", "bar");
			this.bars = this.canvas.selectAll("g.bar").data(this.data);
			this.tooltipLayer = d3.select("body").append("div")
				.attr("class", "tooltip")
				.style("opacity", 0);

			const self = this;

			this.full_barWidth = self.pf_x_scale(1);
			this.drawn_barWidth = this.full_barWidth * .525;
			this.center_correction = (this.full_barWidth - this.drawn_barWidth) / 2;

			this.yAxis = d3.svg.axis()
				.scale(this.pf_y_scale)
				.orient("left")
				.tickPadding(0).tickSize(0);

			this.chart.append("g")
				.attr("transform", `translate(${this.drawTargetParams.margins[3]}, ${this.drawTargetParams.margins[0]})`)
				.call(this.yAxis)
				.attr("class", "y axis");

			this.seriesSize = this.data.map(d => d['dist'].length).reduce((a, b) => Math.max(a, b));
			for(let index = 0; index < this.seriesSize; index++){

				self.bars.append("rect")
					.attr("class", "block-" + index)
					.attr("y", d =>{
						const ancestorHeight = self.barHeight(d3.sum(d['dist'].slice(0, index)), d.total);
						return Math.round(self.canvasSize.height - self.barHeight(d['dist'][index], d.total) - ancestorHeight);
					})
					.attr("x", (d, i) => self.barPosition(i))
					.attr("width", () => self.barWidth())
					.attr("height", d => Math.round(self.barHeight(d['dist'][index], d.total)))
					//.on("click", {})
					.on("mouseover", d =>{
						self.tooltipLayer.transition()
							.duration(200)
							.style("opacity", .95);
						// console.log(d);
						const content = `Antibiotic: ${d.label}<br/>Phenotype: ${d.phenotypes[index]}<br/>Count: ${d['dist'][index]}`;
						self.tooltipLayer.html(content)
							.style("left", d3.event.pageX + "px")
							.style("top", (d3.event.pageY - 28) + "px")
					})
					.on("mouseout", () => self.tooltipLayer.transition()
						.duration(500)
						.style("opacity", 0)
					);
			}

			// Place the text. We have a little height adjustment on the dy
			// to make sure text is centered in the block rather than set
			// along the baseline.

			this.bars.append("text").text(d => d.label)
				.attr("y", Math.round(this.canvasSize.height - 11))
				.attr("x", (d, i) => self.textPosition(i))
				.attr("transform", (d, i) =>{
					const y = Math.round(self.canvasSize.height - 11);
					const x = self.textPosition(i);
					return `rotate(270, ${x}, ${y})`;
				})
				.attr("dy", ".35em");

		},

		textPosition: function(index){
			return Math.floor((this.full_barWidth * index) + this.drawn_barWidth);
		},
		barPosition: function(index){
			return Math.floor(this.full_barWidth * index + this.center_correction);
		},
		barWidth: function(){
			return Math.floor(this.drawn_barWidth);
		},
		barHeight: function(value, total){
			if(this.normalize){
				return this.canvasSize.height - this.pf_y_scale((value / total) * 100);
			}else{
				return this.canvasSize.height - this.pf_y_scale(value);
			}
		},
		scale: function(){

			if(this.normalize){
				this.maxValue = 100;
			}else{
				this.maxValue = this.data.map((d) => d.total || 0)
					.reduce((a, b) => Math.max(a, b));
			}

			// update axis
			this.pf_y_scale = d3.scale.linear().range([0, this.canvasSize.height]).domain([this.maxValue, 0]);
			this.yAxis = d3.svg.axis().scale(this.pf_y_scale).orient("left").tickPadding(0).tickSize(0);
			this.chart.select("g.y").transition().duration(600).call(this.yAxis);

			// update bars
			for(let index = 0; index < this.seriesSize; index++){
				this.bars.select(`rect.block-${index}`).transition().duration(600)
					.attr("y", (d) =>{
						const ancestorHeight = this.barHeight(d3.sum(d['dist'].slice(0, index)), d.total);
						return Math.round(this.canvasSize.height - this.barHeight(d['dist'][index], d.total) - ancestorHeight);
					})
					.attr("height", d => Math.round(this.barHeight(d['dist'][index], d.total)));
			}
		},
		sort: function(){
			const self = this;

			const sortCriteria = domQuery(".chart-wrapper .sort .active")[0].className.split(" ")[0];

			if(sortCriteria === this.currentSort){
				this.ascendSort = !this.ascendSort;
			}else{
				this.currentSort = sortCriteria;
			}

			if(this.currentSort === "label"){
				this.bars.sort(function(a, b){
					let orderCode = 0;
					if(a.label < b.label){
						orderCode = -1;
					} else if (a.label > b.label){
						orderCode = 1;
					}

					if (!self.ascendSort) {
						orderCode = orderCode * -1;
					}
					return orderCode;
				});
			} else if (this.currentSort === "value"){
				this.bars.sort(function(a, b){
					const aValue = self.barHeight(a['dist'][0], a.total);
					const bValue = self.barHeight(b['dist'][0], b.total);

					let orderCode = aValue - bValue;
					if(!self.ascendSort){
						orderCode = orderCode * -1;
					}
					return orderCode;
				})
			}

			for(let index = 0; index < this.seriesSize; index++){
				this.bars.select(`rect.block-${index}`).transition().duration(600)
					.delay((d, i) => 10 * i)
					.attr("x", (d, i) => self.barPosition(i));
			}

			this.bars.select("text").transition().duration(600)
				.delay((d, i) => 10 * i)
				.attr("x", (d, i) => self.textPosition(i))
				.attr("transform", (d, i) =>{
					const y = Math.round(self.canvasSize.height - 11);
					const x = this.pf_x_scale(i) + self.pf_x_scale(1) / 2;
					return `rotate(270, ${x}, ${y})`;
				})

		},

		renderLegend: function(legend){
			d3.select("p.legend").selectAll("svg")
				.data(legend)
				.insert("circle")
				.attr("cx", 8).attr("cy", 8).attr("r", 8)
				.attr("class", (d, i) => "bar" + (i + 1) + "-sample");

			d3.select("p.legend").selectAll("span")
				.data(legend)
				.text(d => d);
		},
		prepareSVGDrawTarget: function(params){

			const chartSize = params.size || this.getContainerSize(params.target);
			const chartMargin = params.margins || [0, 0, 0, 0];

			const canvasSize = {
				width: chartSize.width - chartMargin[1] - chartMargin[3],
				height: chartSize.height - chartMargin[0] - chartMargin[2]
			};

			const chart = d3.select(".chart")
				.insert("svg", ":first-child")
				.attr("class", "svgChartContainer")
				.attr("width", chartSize.width)
				.attr("height", chartSize.height);

			const canvas = chart.append("g")
				.attr("class", "svgChartCanvas")
				.attr("width", canvasSize.width)
				.attr("height", canvasSize.height)
				.attr("transform", "translate(" + chartMargin[3] + "," + chartMargin[0] + ")");

			return {
				"chart": chart,
				"canvas": canvas,
				"canvas_size": canvasSize,
				"chart_size": chartSize
			};
		},
		getContainerSize: function(){
			const container = domQuery(".chart", this.node)[0] || null;

			if(container){
				return {
					width: domStyle.get(container, "width"),
					height: domStyle.get(container, "height")
				};
			}else{
				console.error("Cannot find chart Dom Node");
				return {
					width: 0,
					height: 0
				};
			}
		},
		resize: function(){
			// TODO: catch event and resize
			console.log("resizing...");
		}
	})
});