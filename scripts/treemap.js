function dibujarMapa() 
{
    //Seleccionamos elemento en pagina y asignamos constantes para espacio deseado.
    var el_id = 'mapa';
    var obj = document.getElementById(el_id);
    const margen = { arriba: 30, derecha: 0, abajo: 20, izquierda: 0 },
        ancho = 800,
        altura = 750,
        numeroFormato = d3.format(",");
    
    //Variable que nos permite saber cuando estamos en transicion
    var isTransition;

    //Determina X y Y para tamaño de cajas.
    var x = d3.scaleLinear()
        .domain([0, ancho])
        .range([0, ancho]);

    var y = d3.scaleLinear()
        .domain([0, altura])
        .range([0, altura]);

    //Creamos mapa con las dimensiones deseadas.    
    var mapa = d3.treemap()
                 .size([ancho, altura])
                 .paddingInner(0)
                 .round(false);

    //Creamos canvas en elemento de pagina para mostrar.
    var svg = d3.select('#' + el_id).append("svg")
                .attr("width", ancho + margen.izquierda + margen.derecha)
                .attr("height", altura + margen.abajo + margen.arriba)
                .style("margin-left", -margen.izquierda + "px")
                .style("margin.right", -margen.derecha + "px")
                .append("g")
                .attr("transform", "translate(" + margen.izquierda + "," + margen.arriba + ")")
                .style("shape-rendering", "crispEdges");

    //Creamos elemento padre.
    var parent = svg.append("g")
               .attr("class", "grandparent");

    //Atributos de caja en elemento padre.
    parent.append("rect")
     .attr("y", -margen.arriba)
     .attr("width", ancho)
     .attr("height", margen.arriba);

    //Atributos de texto en caja de elemento padre.          
    parent.append("text")
     .attr("x", 6)
     .attr("y", 6 - margen.arriba)
     .attr("dy", ".75em");

    //Especificamos ruta donde se encuentra nuestro archivo con informacion de diferentes sectores.
    d3.json("data/json/stock-data.json", function (data) 
    {
        //Asignamos elemento raiz.
        var raiz = d3.hierarchy(data);


        mapa(raiz.sum(function (d) 
                    {       
                        return d.value;
                    })
                    .sort(function (a, b) 
                    {
                        return b.height - a.height || b.value - a.value
                    })
        );
        
        //Mostramos mapa a partir de raiz.
        mostrar(raiz);

        function mostrar(d) {
            
            //Manipulamos texto de elemento padre y creamos handler para transicion en evento de click.
            parent.datum(d.parent)
                  .on("click", transicion)
                  .select("text")
                  .text(name(d));

            //Color de elemento padre.
            parent.datum(d.parent)
                  .select("rect")
                  .attr("fill", function () 
                  {
                    return '#4B76E8';
                  });
            
            //Creamos elemento padre en canvas.     
            var p1 = svg.insert("g", ".grandparent")
                        .datum(d)
                        .attr("class", "depth");
            
            //Seleccionamos hijos de elemento padre.
            var p = p1.selectAll("g")
                .data(d.children)
                .enter()
                .append("g");

            //Agregar clase y handler para elementos que contienen hijos.
            p.classed("children", true)
             .on("click", transicion);

            p.selectAll(".child")
             .data(function (d) 
             {
                    return d.children || [d];
             })
             .enter().append("rect")
             .attr("class", "child")
             .call(rect);

            //Agregar titulo a padre.
            p.append("rect")
             .attr("class", "parent")
             .call(rect)
             .append("title")
             .text(function (d) 
             {
                return (d.data.symbol === undefined) ? d.data.name : d.data.symbol; //Mostramos nombre de sector. En caso de ser una accion, mostramos simbolo.
             });

            //Agregar un objeto nos permite manipular mejor el texto.
            p.append("foreignObject")
                .call(rect)
                .attr("class", "foreignobj")
                .append("xhtml:div")
                .attr("dy", ".75em")
                .html(function (d) 
                {
                    var nombre = (d.data.symbol === undefined) ? d.data.name : d.data.symbol;
                    return '' + '<p class="title"> ' + nombre + '</p>' +'<p>' + numeroFormato(d.value) + '</p>'; //Mostramos nombre de sector/accion y suma de valor/market cap.
                })
                .attr("class", "textdiv"); //textdiv class allows us to style the text easily with CSS

            //Funcion de transicion a nueva vista.
            function transicion(d) {
                
                limpiarGrafica(); //Limpiamos grafica en caso de tener una accion seleccionada.
                
                if(d.data.symbol !== undefined)
                {
                    dibujarGrafica(d.data.name, d.data.symbol); //Si seleccionamos una accion, mostrar grafica de velas.
                    return;
                }   

                //Creamos nuevo objeto padre para nueva vista.
                isTransition = true;
                var p2 = mostrar(d),
                    t1 = p1.transition().duration(650),
                    t2 = p2.transition().duration(650);

                //Actulizamos cajas despues de cargar elementos.
                x.domain([d.x0, d.x1]);
                y.domain([d.y0, d.y1]);

                svg.style("shape-rendering", null);

                //Dibuja hijos encima de elementos padre.
                svg.selectAll(".depth").sort(function (a, b) {
                    return a.depth - b.depth;
                });

                //Transicion a nuevo texto.
                p2.selectAll("text").style("fill-opacity", 0);
                p2.selectAll("foreignObject div").style("display", "none");

                //Transicion a nueva vista en patron desvanecido.
                t1.selectAll("text").call(text).style("fill-opacity", 0);
                t2.selectAll("text").call(text).style("fill-opacity", 1);
                t1.selectAll("rect").call(rect);
                t2.selectAll("rect").call(rect);
                t1.selectAll(".textdiv").style("display", "none");
                t1.selectAll(".foreignobj").call(foreign);
                t2.selectAll(".textdiv").style("display", "block");
                t2.selectAll(".foreignobj").call(foreign);

                // Elimina viejos elementos al terminar.
                t1.on("end.remove", function () {
                    this.remove();
                    transitioning = false;
                });
            }

            return p;
        }
        
        //Function para acomodar nombre de breadcrumbs.
        function text(text) 
        {
            text.attr("x", function (d) 
                {
                    return x(d.x) + 6;
                })
                .attr("y", function (d) 
                {
                    return y(d.y) + 6;
                });
        }

        //Funcion para determinar atributos de caja (dimensiones, ubicacion y color).
        function rect(rect) 
        {
            rect.attr("x", function (d) {
                    return x(d.x0);
                })
                .attr("y", function (d) {
                    return y(d.y0);
                })
                .attr("width", function (d) {
                    return x(d.x1) - x(d.x0);
                })
                .attr("height", function (d) {
                    return y(d.y1) - y(d.y0);
                })
                .attr("fill", function (d) {
                    return '#bbbbbb';
                });
        }

        //Funcion que nos permite manipular atributos de texto de cada caja.
        function foreign(foreign) 
        { 
            foreign.attr("x", function (d) 
                    {
                        return x(d.x0);
                    })
                    .attr("y", function (d) {
                        return y(d.y0);
                    })
                    .attr("width", function (d) {
                        return x(d.x1) - x(d.x0);
                    })
                    .attr("height", function (d) {
                        return y(d.y1) - y(d.y0);
                    });
        }

        //Funcion que regresa el camino de menu breadcrumbs.
        function name(d) {
            return breadcrumbs(d);
        }

        //Nos permite mostrar los elementos que se han recorrido. (Exchange > Sector)
        function breadcrumbs(d) 
        {
            var res = "";
            var separador = " > ";

            //Iteramos elementos que han sido visitados.
            d.ancestors().reverse().forEach(function (i) 
            {
                res += i.data.name + separador;
            });
            
            return res.split(separador).filter(function (i){ return i !== "";}).join(separador); //Regresa texto con recorrido completo.
        }
    });
}

dibujarMapa();