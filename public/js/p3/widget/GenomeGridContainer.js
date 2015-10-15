define([
	"dojo/_base/declare", "./GridContainer","dojo/on",
	"./GenomeGrid","dijit/popup","dojo/_base/lang",
	"dijit/TooltipDialog","./FacetFilterPanel","dojo/topic"

], function(
	declare, GridContainer,on,
	GenomeGrid,popup,lang,
	TooltipDialog,FacetFilterPanel,Topic
){

	var vfc = '<div class="wsActionTooltip" rel="dna">View FASTA DNA</div><div class="wsActionTooltip" rel="protein">View FASTA Proteins</div><hr><div class="wsActionTooltip" rel="dna">Download FASTA DNA</div><div class="wsActionTooltip" rel="downloaddna">Download FASTA DNA</div><div class="wsActionTooltip" rel="downloadprotein"> '
	var viewFASTATT=  new TooltipDialog({content: vfc, onMouseLeave: function(){ popup.close(viewFASTATT); }})

	var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>'
	var downloadTT=  new TooltipDialog({content: dfc, onMouseLeave: function(){ popup.close(downloadTT); }})

	on(downloadTT.domNode, "div:click", function(evt){
		var rel = evt.target.attributes.rel.value;
		console.log("REL: ", rel);
		var selection = self.actionPanel.get('selection')
		var dataType=(self.actionPanel.currentContainerWidget.containerType=="genome_group")?"genome":"genome_feature"
		var currentQuery = self.actionPanel.currentContainerWidget.get('query');
		console.log("selection: ", selection);
		console.log("DownloadQuery: ", dataType, currentQuery );
		window.open("/api/" + dataType + "/" + currentQuery + "&http_authorization=" + encodeURIComponent(window.App.authorizationToken) + "&http_accept=" + rel + "&http_download");		
		popup.close(downloadTT);
	});

	return declare([GridContainer],{
		gridCtor: GenomeGrid,
		facetFields: ["public","genome_status","reference_genome","antimicrobial_resistance","antimicrobial_resistance_evidence","isolation_country","host_name","disease","collection_date"],
		getFilterPanel: function(opts){
			return;
			var fp = new FacetFilterPanel({dataModel: this.grid.dataModel,facetFields: this.facetFields, query: this.query, filter: this.filter, style: "width: 100%;height: 100px;margin:0px;margin-top:1px;margin-bottom:-5px;padding:4px;",splitter:true, region: "top", layoutPriority: 2})
			fp.watch("filter", lang.hitch(this, function(attr,oldVal,newVal){
				console.log("setFilter Watch() callback. Old Value: ", oldVal, " newValue: ", newVal);
				on.emit(this.domNode, "UpdateHash", {bubbles: true, cancelable: true, hashProperty: "filter", value: newVal, oldValue: oldVal} )
			}));
			return fp;	
		},
		containerActions: GridContainer.prototype.containerActions.concat([
			[
				"DownloadTable",
				"fa fa-download fa-2x",
				{label:"DOWNLOAD",multiple: false,validTypes:["*"],tooltip: "Download Table", tooltipDialog:downloadTT}, 
				function(selection){	
					popup.open({
						popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
						around: this.containerActionBar._actions.DownloadTable.button,
						orient: ["below"]
					});
				},
				true
			],
			[
				"AnchorCurrentFilters",
				"fa icon-anchor fa-2x",
				{label:"ANCHOR",multiple: false,validTypes:["*"],tooltip: "Anchor the active filter set to the current context.", tooltipDialog:downloadTT}, 
				function(selection){	
					var q = this.query;
					if (this.filter){

						// q = "and(" + q + "," + this.filter + ")";
						// console.log("New Anchor Query:",q)
						on.emit(this.domNode, "SetAnchor", { bubbles: true, cancelable: true, filter: this.filter})
					}else{
						console.log("No Filters to set new anchor");
					}

				},
				true
			],
			[
				"ToggleFilters",
				"fa icon-filter fa-2x",
				{label:"FILTERS",multiple: false,validTypes:["*"],tooltip: "Toggle Filters", tooltipDialog:downloadTT}, 
				function(selection){	
					console.log("Toggle Filters");
					on.emit(this.domNode,"ToggleFilters",{});
				},
				true
			]
		]),
		selectionActions: GridContainer.prototype.selectionActions.concat([
			[
				"ViewGenome",
				"fa icon-eye fa-2x",
				{label: "OPEN",ignoreDataType:true, multiple: false,validTypes:["*"], tooltip: "Open Genome View"},
				function(selection){
					console.log("Selected Genome: ", selection);
					Topic.publish("/navigate", {"href": "/view/Genome/" + selection[0].genome_id});
				},
				false
			],
			[
				"ViewFASTA",
				"fa icon-fasta fa-2x",
				{label: "FASTA",ignoreDataType:true, multiple: true,validTypes:["*"], tooltip: "View FASTA Data",tooltipDialog:viewFASTATT},
				function(selection){
					popup.open({
						popup: this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog,
						around: this.selectionActionBar._actions.ViewFASTA.button,
						orient: ["below"]
					});
				},
				false
			]
		])
	});
});