var margin = {
	top: 50,
	right: -10,
	bottom: 50,
	left: 20
};


var width = 800 - margin.left - margin.right,
	height = 300 - margin.top - margin.bottom;

function permutator(inputArr) {
	var results = [];

	function permute(arr, memo) {
		var cur, memo = memo || [];

		for (var i = 0; i < arr.length; i++) {
			cur = arr.splice(i, 1);
			if (arr.length === 0) {
				results.push(memo.concat(cur));
			}
			permute(arr.slice(), memo.concat(cur));
			arr.splice(i, 0, cur[0]);
		}

		return results;
	}

	return permute(inputArr);
}

function createParallelAxis(basePath, propertyNames, theFormat,theTitle, multiplier,useLog) {

	var svg = d3.select("body").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	svg.append("text")
		.attr("fill", "#444444")
		.attr("y", -35)
		.attr("x", 5)
		.style("font-size","16px")
		.text(theTitle);

	var xScale = d3.scaleLinear()
		.range([0, width])
		.domain([0, propertyNames.length]);
	

	function loadAllData(callback) {
		var toLoadCount = propertyNames.length;
		var allData = [];
		for (var i = 0; i < propertyNames.length; i++) {
			(function() {
				var currentIndex = i;
				var propertyName = propertyNames[i];

				d3.text(basePath + "/" + propertyName + ".txt", function(data) {
					var dataValues = data.split("\n").filter(function(d) {
							return d.length;
						})
						.map(function(d) {
							var lineData = d.split("\t").filter(function(d) {
								return d.length;
							}).map(function(d) {
								return multiplier*(+d);
							});
							var entry = {};
							entry.mean = d3.sum(lineData) / lineData.length;
							entry.stddev = Math.sqrt(d3.sum(lineData.map(function(d, i) {
								return (d - entry.mean) * (d - entry.mean);
							})) / lineData.length);
							//entry.mean = 0.5*(d3.max(lineData)+d3.min(lineData))
							//entry.stddev = d3.max(lineData)-d3.min(lineData);
							return entry;
						});
					allData[currentIndex] = dataValues;
					toLoadCount--;
					if (toLoadCount == 0) {
						callback(allData);
					}
				});
			})();
		}
	}

	d3.text(basePath + "/../order.txt", function(data) {
		var loadOrder = data.split("\n").filter(function(d) {
			return d.length;
		})
		console.log(loadOrder);

		var labelsData = loadOrder.map(function(d, i) {
			entry = {};
			entry.index = i;
			entry.text = d;
			return entry;
		});


		loadAllData(function(allData) {
			console.log(allData);

			function reorderColumns(propertyNames, allData,yScales, newOrder) {
				var newData = [];
				var newPropertyNames = [];
				var newYScales = [];
				for (var i = 0; i < newOrder.length; i++) {
					newData.push(allData[newOrder[i]]);
					newPropertyNames.push(propertyNames[newOrder[i]]);
					newYScales.push(yScales[newOrder[i]]);
				}
				return [newPropertyNames, newData,newYScales];
			}

			function calcScore(data,yScales) {
				var score = 0.0;
				var propertiesCount = data.length;
				var networksCount = data[0].length;
				for (var i = 1; i < propertiesCount; i++) {
					for (var j = 0; j < networksCount; j++) {
						score += Math.abs(data[i][j].mean - data[i - 1][j].mean);
					}
				}
				return score;
			}

			var yScales = [];
			if(!useIndividualScale){
				var defaultYScale = d3.scaleLinear()
					.range([height, 0]);
				
				if(useLog){
					defaultYScale = d3.scaleLog()
						.range([height, 0]);
				
				}
				
				var minData = d3.min(allData, function(entries) {
					return d3.min(entries, function(d) {
						return d.mean;
					});
				});

				var maxData = d3.max(allData, function(entries) {
					return d3.max(entries, function(d) {
						return d.mean;
					});
				});
				defaultYScale.domain([minData, maxData]);//.nice(10);
				for (var i = 0; i < propertyNames.length; i++) {
					yScales.push(defaultYScale);
				}
			}else{
				for (var i = 0; i < propertyNames.length; i++) {
					var currentYScale = d3.scaleLinear()
						.range([height, 0]);

					if(useLog){
						currentYScale = d3.scaleLog()
							.range([height, 0]);
					
					}
					currentYScale.domain(d3.extent(allData[i], function(d) {
							return d.mean;
						}));//.nice(2);
						yScales.push(currentYScale);
				}
			}

			var initialPermutation = [];
			for (var i = 0; i < allData.length; i++) {
				initialPermutation.push(i);
			}
			console.log("Names:"+propertyNames);

			var permutations = permutator(initialPermutation);
			//console.log(permutations);
			var minScore = Infinity;
			var minResult = [propertyNames, allData];
			for (var i = 0; i < permutations.length; i++) {
				var permutation = permutations[i];
				console.log(permutation);
				var resultedData = reorderColumns(propertyNames, allData,yScales, permutation);
				var score = calcScore(resultedData[1],resultedData[2]);
				console.log("Score(" + resultedData[0] + "): " + score);
				if (score < minScore) {
					minResult = resultedData;
					minScore = score;
				}
			}

			propertyNames = minResult[0];
			allData = minResult[1];
			yScales = minResult[2];


			lines = [];

			for (var i = 0; i < labelsData.length; i++) {
				lines.push([{
					x: 0,
					y: 0,
					errorTop: 0,
					errorBottom: 0,
					width: 1.0
				}, {
					x: 0,
					y: 0,
					errorTop: 0,
					errorBottom: 0,
					width: 1.0
				}]);
			}


			for (var i = 0; i < propertyNames.length; i++) {
				propertyName = propertyNames[i];
				propertyData = allData[i];
				yScale = yScales[i];

				var propertyAxis = d3.axisRight()
					.scale(yScale)
					.ticks(4)
					.tickSizeInner(10.0)
					.tickSizeOuter(5.0)
					.tickFormat(theFormat)
					.tickPadding(3);

				svg.append("g")
					.attr("class", "y axis")
					.attr("transform", "translate(" + xScale(i + 0.5) + ",0)")
					.call(propertyAxis);

				for (var j = 0; j < labelsData.length; j++) {
					lines[j].push({
						x: 0,
						y: yScale(propertyData[j].mean),
						errorTop: yScale(propertyData[j].mean + 0.5*propertyData[j].stddev),
						errorBottom: yScale(propertyData[j].mean - 0.5*propertyData[j].stddev),
						width: yScale(propertyData[j].stddev) - yScale(0)
					});
				}
				console.log(lines);
			}
			
			labelsData = labelsData.sort(function(a, b) {
				return lines[a.index][2].y - lines[b.index][2].y;
			});



			var color = d3.scaleOrdinal(d3.schemeCategory20);

			for (var i = 0; i < labelsData.length; i++) {
				color(i);
			}

			// svg.selectAll(".titleSymbol")
			// 	.data(propertyNames)
			// 	.enter().append("polygon")
			// 	.attr("points", function(d, i) {
			// 		console.log(d);
			// 		if (d in propertyToSymbol) {
			// 			console.log(propertyToSymbol[d]);
			// 			var centerX = xScale(i + 0.5);
			// 			var centerY = -15;
			// 			var polygonString =  propertyToSymbol[d].map(function(d) {
			// 				return [d[0]+centerX, d[1]+centerY].join(",");
			// 			}).join(" ");
			// 			console.log(polygonString);
			// 			return polygonString;
			// 		} else {
			// 			return "";
			// 		}
			// 	})
			// 	.attr("class", "titleSymbol")
			// 	.attr("stroke", "#777777")
			// 	.style("opacity", 1.0)
			// 	.attr("stroke-width", 1.0)
			// 	.attr("fill", "#fdfdfd");

			var titles = svg.selectAll(".title")
				.data(propertyNames)
				.enter().append("g")
				.attr("class", "title")
				.append("text")
				.attr("fill", "#444444")
				.attr("y", -10)
				.attr("x", function(d, i) {
					return xScale(i + 0.5);
				})
				.text(function(d) {
					return d;
				});



			var labelsScale = d3.scaleLinear()
				.range([0, height])
				.domain([0, labelsData.length - 1]);

			var labels = svg.selectAll(".label")
				.data(labelsData)
				.enter().append("g")
				.attr("class", "label")
				.append("text")
				.attr("x", xScale(0.3) - 5)
				.attr("y", function(d, i) {
					return labelsScale(i) + 3;
				})
				.style("fill", function(d, i) {
					return d3.rgb(color(d.index)).darker(0.8);
				})
				.text(function(d) {
					return d.text;
				});


			for (var j = 0; j < labelsData.length; j++) {
				labelEntry = labelsData[j];

				for (var i = 0; i < lines[labelEntry.index].length; i++) {
					lines[labelEntry.index][i].x = xScale(i - 1.5);
				};

				lines[labelEntry.index][0] = {
					x: xScale(0.3),
					y: labelsScale(j),
					errorTop: 0,
					errorBottom: 0,
					width: 1.0
				};
				lines[labelEntry.index][1] = {
					x: xScale(0.3) + 10,
					y: labelsScale(j),
					errorTop: 0,
					errorBottom: 0,
					width: 1.0
				};

				var lineDraw = d3.line()
					.x(function(d) {
						return d.x;
					})
					.y(function(d, i) {
						return d.y;
					});

				var currentLines = lines[labelEntry.index];
				var propertiesLines = currentLines.filter(function(d, i) {
					return i > 1;
				});
				var labelsLines = currentLines.filter(function(d, i) {
					return i < 3;
				});

				svg.append("path")
					.datum(labelsLines)
					.attr("fill", "none")
					.attr("stroke", "steelblue")
					.attr("stroke-linejoin", "round")
					.attr("stroke-linecap", "round")
					.style("stroke-dasharray", ("3, 3"))
					.attr("stroke-width", 1) //(labelsData.length-j+1)*1.0+1.0)
					.style("stroke", function(d, i) {
						return d3.rgb(color(labelEntry.index));
					})
					.style("opacity", 1.0)
					.attr("d", lineDraw);

				var polygonsString = propertiesLines.concat(propertiesLines.concat().reverse())
					.map(function(d, i) {
						if (i < propertiesLines.length) {
							return [d.x, d.errorBottom].join(",");
						} else {
							return [d.x, d.errorTop].join(",");
						};
					}).join(" ");

				svg.append("polygon")
					.attr("points", polygonsString)
					.attr("stroke", "red")
					.style("opacity", 0.2)
					.style("fill", function(d, i) {
						return d3.rgb(color(labelEntry.index));
					})
					.attr("stroke", "none");

				//console.log(lines[labelEntry.index]);
				svg.append("path")
					.datum(propertiesLines)
					.attr("fill", "none")
					.attr("stroke", "steelblue")
					.attr("stroke-linejoin", "round")
					.attr("stroke-linecap", "round")
					.attr("stroke-width", 1.5) //(labelsData.length-j+1)*1.0+1.0)
					.style("stroke", function(d, i) {
						return d3.rgb(color(labelEntry.index));
					})
					.style("opacity", 1.0)
					.attr("d", lineDraw);

			}
		});
	});


}

useIndividualScale = true;

	//d3.select("body").append("h3").text(simulationName);

	createParallelAxis("data/points", [
	// "Ad",
	// "Cc",
	// "Ed",
	// "Est",
	// "L",
	"normMAd",
	"normMCc",
	"normMEd",
	"normML",
	"normAll",
	], d3.format(".2"),"(a) Malleability",1.0,false);
