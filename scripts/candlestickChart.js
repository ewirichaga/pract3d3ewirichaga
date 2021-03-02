function dibujarGrafica(nombre, simbolo) {
	
	//Pasamos la ruta del archivo csv de la accion que queremos mostras en la grafica de velas.
	d3.csv("data/csv/" + simbolo + ".csv").then(function(precios) {
		
		//Creamos un arreglo de meses para mostrar nombres de mes dependiendo de su valor numerico correspondiente.
		const meses = {0 : 'Jan', 1 : 'Feb', 2 : 'Mar', 3 : 'Apr', 4 : 'May', 5 : 'Jun', 6 : 'Jul', 7 : 'Aug', 8 : 'Sep', 9 : 'Oct', 10 : 'Nov', 11 : 'Dec'}
		var formatoFecha = d3.timeParse("%Y-%m-%d"); 
		for (var i = 0; i < precios.length; i++) 
		{
			precios[i]['Date'] = formatoFecha(precios[i]['Date']); //Asignamos nuevo formato de fecha al arreglo de precios.
		}

		//Constantes de margen de acuerdo al espacio deseado para mostrar grafica.
		const margen = {arriba: 15, derecha: 65, abajo: 205, izquierda: 50},
		ancho = 1000 - margen.izquierda - margen.derecha,
		altura = 625 - margen.arriba - margen.abajo;
		
		//Seleccionamos el elemento en la pagina para mostrar nombre y simbolo de la compañia seleccionada.
		d3.select("#tituloGrafica").append("text").text(nombre + ' - ' + simbolo);

		//Seleccionamos el elemento y asignamos atributos para determinar espacio donde mostraremos la grafica.
		var svg = d3.select("#grafica")
					.attr("width", ancho + margen.izquierda + margen.derecha)
					.attr("height", altura + margen.arriba + margen.abajo)
					.append("g")
					.attr("transform", "translate(" + margen.izquierda + "," + margen.arriba + ")");

		//Creamos un arreglo de fechas para determinar escalas de eje X			
		let fechas = _.map(precios, 'Date');

		//Creamos la escala de eje X utilizando la cantidad de fechas y ancho disponible.
		var escalaX = d3.scaleLinear().domain([-1, fechas.length]).range([0, ancho]);
		var escalaFechas = d3.scaleQuantize().domain([0, fechas.length]).range(fechas);
		
		//Banda X con espacio distribuidos de manera equitativa utilizando la cantidad de fechas y el ancho disponible.
		let bandaX = d3.scaleBand().domain(d3.range(-1, fechas.length)).range([0, ancho]).padding(0.3)
		
		//Objeto que representa eje X, se utiliza la escala X creada previamente.
		var ejeX = d3.axisBottom()
					 .scale(escalaX)
					 .tickFormat(function(d) //Funcion para dar formato a las fechas que se muestran en el eje X
					 {
						d = fechas[d]
						var dia = (d.getDate() < 10) ? '0' + d.getDate() : d.getDate();
						return  dia + ' ' + meses[d.getMonth()] + ' ' + d.getFullYear()
					});

		//Dibujamos un rectangulo con el ancho y alto deseados.			
		svg.append("rect")
	        .attr("id","rect")
		    .attr("width", ancho)
			.attr("height", altura)
			.style("fill", "none")
			.style("pointer-events", "all")
			.attr("clip-path", "url(#clip)");
		
		//Dibujamos eje X.
		var x = svg.append("g")
					.attr("class", "axis x-axis")
					.attr("transform", "translate(0," + altura + ")")
					.call(ejeX);
		
		//Damos formato al texto de cada tick. La funcion wrap nos permite manipular los atributos del texto.
		x.selectAll(".tick text")
		 .call(wrap, bandaX.bandwidth());

		//Determinamos precio maximo y minimo para crear nuestra escala de Y.
		var precioMinimo = d3.min(precios.map(r => r.Low));
		var precioMaximo = d3.max(precios.map(r => r.High));
		var escalaY = d3.scaleLinear().domain([precioMinimo, precioMaximo]).range([altura, 0]).nice();

		//Creamos el objeto de eje utilizando la escala de Y creada previamente.
		var ejeY = d3.axisLeft()
					 .scale(escalaY)
		
		//Dibujamos eje Y.
		var y = svg.append("g")
				   .attr("class", "axis y-axis")
				   .call(ejeY);
		
		//Dibujamos la grafica		   
		var grafica = svg.append("g")
						 .attr("class", "chartBody")
						 .attr("clip-path", "url(#clip)");
		
		//Elemento que utilizaremos para mostrar detalle de cada una de la velas en la grafica.
		var velaDetalle = d3.select("body").append("div")	
						    .attr("class", "tooltip")				
	                        .style("opacity", 0);							

		//Dibujamos las velas.
		let velas = grafica.selectAll(".candle")
		   					 .data(precios)
		   					 .enter()
		   					 .append("rect")
		   					 .attr('x', (d, i) => escalaX(i) - bandaX.bandwidth()) //Utilizamos el ancho de X para desglosar velas.
		   					 .attr("class", "candle")
		   					 .attr('y', d => escalaY(Math.max(d.Open, d.Close))) //El rectangulo ocupara apertura y cierre como valores Y.
		   					 .attr('width', bandaX.bandwidth())
		   					 .attr('height', d => (d.Open === d.Close) ? 1 : escalaY(Math.min(d.Open, d.Close)) - escalaY(Math.max(d.Open, d.Close)))
		   					 .attr("fill", d => (d.Open === d.Close) ? "silver" : (d.Open > d.Close) ? "red" : "green") //Asignamos color de vela dependiendo si tuvo un cierre negativo, positivo o neutral.
		   					 .on("mouseover", function() //Mostraremos elemento velaDetalle si ponemos el cursor sobre vela.
							{ 
								velaDetalle.style('opacity', 1);
								focus.style("display", null); 
		  					})
							 .on("mouseout", function() //Ocultamos detalle cuando abandonamos vela.
							{ 
								velaDetalle.style('opacity', 0);          
								focus.style("display", "none");
							})
		   					 .style('pointer-events', 'all').on('mousemove', function() //Mostramos detalles mientras el cursor siga enfocado en vela.
							{
								var apertura = this.__data__['Open'];
								var alta = this.__data__['High'];
								var baja = this.__data__['Low'];
								var cierre = this.__data__['Close'];
								var cierreAjustado = this.__data__['Adj Close'];
								var volumen = this.__data__['Volume'];

								var text = 'Open: ' + apertura;
								text += '<br>High: ' + alta;
								text += '<br>Low: ' + baja;
								text += '<br>Close: ' + cierre;
								text += '<br>Adj Close: ' + cierreAjustado;
								text += '<br>Volume: ' + volumen;
								
								//Determinamos donde mostrar el detalle basandonos en la ubicacion de cursos y damos unos pixeles de separacion.
								velaDetalle.style('left', d3.event.pageX + 5 + 'px')
          								   .style('top', d3.event.pageY - 30 + 'px')
          								   .html(text.trim()); //Limpiamos espacios vacios de texto.
							});
		
		//Dibujamos altos y bajos de precio
		let sombras = grafica.selectAll("g.line")
		   					 .data(precios)
		   					 .enter()
		   					 .append("line")
		   					 .attr("class", "stem")
		   					 .attr("x1", (d, i) => escalaX(i) - bandaX.bandwidth() / 2)
		   					 .attr("x2", (d, i) => escalaX(i) - bandaX.bandwidth() / 2)
		   					 .attr("y1", d => escalaY(d.High))
		   					 .attr("y2", d => escalaY(d.Low))
		   					 .attr("stroke", d => (d.Open === d.Close) ? "white" : (d.Open > d.Close) ? "red" : "green"); //Asignamos color de sombra dependiendo del tipo de cierre.
		
		svg.append("defs")
		   .append("clipPath")
		   .attr("id", "clip")
		   .append("rect")
		   .attr("width", ancho)
		   .attr("height", altura)

		//Fijamos el ancho y altura sobre el que trabajaremos en acercamientos.
		const ext = [[0, 0], [ancho, altura]];
				
		//Ejecutamos zoom.
		var tiempoAjuste;
		var zoom = d3.zoom()
		  			 .scaleExtent([1, 100])
		     		 .translateExtent(ext)
		  			 .extent(ext)
		  			 .on("zoom", ejecutaZoom) //Inicio de accion de acercamiento.
		  			 .on('zoom.end', zoomTermina); //Final de acercamiento.
		
		svg.call(zoom)

		//Funcion que se ejecuta al iniciar accion de acercamiento.
		function ejecutaZoom() 
		{
			
			var t = d3.event.transform;
			let escalaXZ = t.rescaleX(escalaX); //Creamos nueva escala de X.
			
			//Funcion para ocultar ticks sin etiqueta.
			let esconderTicksSinEtiqueta = function() {
				d3.selectAll('.xAxis .tick text').each(function(d)
				{
					if(this.innerHTML === '') 
					{
						this.parentNode.style.display = 'none'
					}
				})
			}

			//Reescribimos eje de X con nueva escala. Aplicamos formato de fecha a cada tick.
			x.call(
				d3.axisBottom(escalaXZ).tickFormat((d, e, target) => 
				{
					if (d >= 0 && d <= fechas.length-1) {
						d = fechas[d]
						var dia = (d.getDate() < 10) ? '0' + d.getDate() : d.getDate();
						return  dia + ' ' + meses[d.getMonth()] + ' ' + d.getFullYear()
					}
				})
			)

			//Cambiamos atributos de velas y sombras utilizando nueva escala
			velas.attr("x", (d, i) => escalaXZ(i) - (bandaX.bandwidth()*t.k)/2)
				 .attr("width", bandaX.bandwidth()*t.k);

			sombras.attr("x1", (d, i) => escalaXZ(i) - bandaX.bandwidth()/2 + bandaX.bandwidth()*0.5);
			sombras.attr("x2", (d, i) => escalaXZ(i) - bandaX.bandwidth()/2 + bandaX.bandwidth()*0.5);

			esconderTicksSinEtiqueta(); //Escondemos ticks.
			
			//Formato de texto para cada valor de escala.
			x.selectAll(".tick text")
			 .call(wrap, bandaX.bandwidth())

		}

		function zoomTermina() 
		{
			var t = d3.event.transform;
			let escalaXZ = t.rescaleX(escalaX); //Reajustamos escala X.

			clearTimeout(tiempoAjuste)

			//Tiempo de ejecucion 500 milisegundos, durante ese tiempo se ajustan escalas.
			tiempoAjuste = setTimeout(function() 
			{
				//Determinamos rango de fechas dentro en nueva escala.
				var fechaMinima = new Date(escalaFechas(Math.floor(escalaXZ.domain()[0])));
					fechaMaxima = new Date(escalaFechas(Math.floor(escalaXZ.domain()[1])));

				//Nos quedamos con los precios dentro de rango de fechas.
				filtrado = _.filter(precios, d => ((d.Date >= fechaMinima) && (d.Date <= fechaMaxima)));

				//Obtenemos valores minimo y maximo de sombras
				minP = +d3.min(filtrado, d => d.Low);
				maxP = +d3.max(filtrado, d => d.High);
				
				//Creamos buffer con dichos maxP y minP para tener suficiente espacio en escala Y. Esto nos permite mostrar vela completa.
				buffer = Math.floor((maxP - minP) * 0.1);

				//Ajustamos escala Y.
				escalaY.domain([minP - buffer, maxP + buffer]);

				//Transicion a velas y sombras.
				velas.transition()
					   .duration(800)
				   	   .attr("y", (d) => escalaY(Math.max(d.Open, d.Close)))
				       .attr("height",  d => (d.Open === d.Close) ? 1 : escalaY(Math.min(d.Open, d.Close)) - escalaY(Math.max(d.Open, d.Close)));
				
				
				   
				sombras.transition().duration(800)
				 	 .attr("y1", (d) => escalaY(d.High))
				 	 .attr("y2", (d) => escalaY(d.Low))
			    
				//Transicion de escala Y
				y.transition().duration(800).call(d3.axisLeft().scale(escalaY));

			}, 500)
		}
	});
}

//Funcion que nos permite manipular varios aspectos de texto.
function wrap(text, width) {
	text.each(function() {
	  var text = d3.select(this),
		  words = text.text().split(/\s+/).reverse(),
		  word,
		  line = [],
		  lineNumber = 0,
		  lineHeight = 1.1,
		  y = text.attr("y"),
		  dy = parseFloat(text.attr("dy")),
		  tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
	  while (word = words.pop()) {
		line.push(word);
		tspan.text(line.join(" "));
		if (tspan.node().getComputedTextLength() > width) {
		  line.pop();
		  tspan.text(line.join(" "));
		  line = [word];
		  tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
		}
	  }
	});
}

//Funciones para limpiar elementos de grafica y titulo.
function limpiarGrafica(){
	d3.selectAll("#grafica > *").remove();
	limpiarTitulo();
}

function limpiarTitulo(){
	d3.selectAll("#tituloGrafica > *").remove();
}