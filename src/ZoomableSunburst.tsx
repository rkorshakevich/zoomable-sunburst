import React from 'react';
import * as d3 from 'd3';
import { PanelProps, FieldType } from '@grafana/data';
import { SimpleOptions } from 'types';
import { css, cx } from 'emotion';
import { stylesFactory } from '@grafana/ui';
import { arrangeIntoTree } from 'utils';

interface Props extends PanelProps<SimpleOptions> {}

export const ZoomableSunburst: React.FC<Props> = ({ options, data, width, height }) => {
  const styles = getStyles();

  const svgRef = React.useRef<SVGSVGElement>(null);
  const tipRef = React.useRef<HTMLDivElement>(null);

  const paths = [];
  for (const s of data.series) {
    let path = s.name;
    path = path.substring(path.search('{'));
    if (path.startsWith('/')) {
      path = path.substring(1);
    }

    for (const field of s.fields) {
      if (field.type === FieldType.time) {
        continue;
      }
      const val = field.values.get(field.values.length - 1);
      const displayValue = field.display
        ? field.display(val)
        : {
            text: val,
            numeric: val,
            suffix: '',
          };
      const pathArray = path.split('/');
      if (pathArray.length <= +options.depthLimit) {
        paths.push({
          path: pathArray,
          size: val,
          displayValue: `${displayValue.text}${displayValue.suffix || ''}`,
        });
      }
    }
  }

  const dta = arrangeIntoTree(paths);

  React.useEffect(() => {
    if (!dta) {
      return;
    }

    const tip = tipRef.current;

    const children = dta.children.length + 1;
    let colorScheme;
    switch (options.colorSchemeSetting) {
      case 'tableau':
        colorScheme = d3.scaleOrdinal(d3.schemeTableau10);
        break;
      case 'schemeSet3':
        colorScheme = d3.scaleOrdinal(d3.schemeSet3);
        break;
      case 'pastel':
        colorScheme = d3.scaleOrdinal(d3.schemePastel2);
        break;
      case 'interpolateCool':
        colorScheme = d3.scaleOrdinal(d3.quantize(d3.interpolateCool, children));
        break;
      case 'interpolateWarm':
        colorScheme = d3.scaleOrdinal(d3.quantize(d3.interpolateWarm, children));
        break;
      case 'sinebow':
        colorScheme = d3.scaleOrdinal(d3.quantize(d3.interpolateSinebow, children));
        break;
      default:
        colorScheme = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, children));
        break;
    }

    const svg = d3.select(svgRef.current);

    svg.selectAll('*').remove();

    const radius = width > height ? height / 6 : width / 6;
    const arc = d3
      .arc()
      .startAngle((d: any) => d.x0)
      .endAngle((d: any) => d.x1)
      .padAngle((d: any) => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius * 1.5)
      .innerRadius((d: any) => d.y0 * radius)
      .outerRadius((d: any) => Math.max(d.y0 * radius, d.y1 * radius - 1));

    const color = colorScheme;

    const partition = (data: any) => {
      const root = d3
        .hierarchy(data)
        .sort((a, b) => b.value - a.value);
      return d3.partition().size([2 * Math.PI, root.height + 1])(root);
    };

    const root = partition(dta);
    root.each((d: any) => (d.current = d));

    const g = svg.append('g');

    const path = g
      .append('g')
      .selectAll('path')
      .data(root.descendants().slice(1))
      .join('path')
      .attr('fill', (d: any) => {
        while (d.depth > 1) {
          d = d.parent;
        }
        return color(d.data.name);
      })
      .attr('fill-opacity', (d: any) => (arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0))
      .attr('d', (d: any) => arc(d.current))
      .on('mouseenter', function(d: any) {
        d3.select(this)
          .attr('stroke', 'white')
          .attr('stroke-width', 2);
        const percentage = Math.round((d.data.value * 100) / d.parent.data.value).toFixed(1);
        tip.innerHTML = `${d.data.name} is <b>${percentage}%</b> of ${d.parent.data.name}`;
      })
      .on('mouseleave', function(d: any) {
        d3.select(this).attr('stroke', 'none');
        tip.innerHTML = '';
      });

    path
      .filter((d: any) => d.children)
      .style('cursor', 'pointer')
      .on('click', clicked);

    path.append('title').text((d: any) => `${d.data.name}\n${d.data.displayValue}`);

    const label = g
      .append('g')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .style('user-select', 'none')
      .selectAll('text')
      .data(root.descendants().slice(1))
      .join('text')
      .attr('dy', '0.35em')
      .attr('fill-opacity', (d: any) => +labelVisible(d.current))
      .attr('transform', (d: any) => labelTransform(d.current))
      .text((d: any) => d.data.name);

    const parent = g
      .append('circle')
      .datum(root)
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('click', clicked);

    const centralLabel = svg
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('fill', '#888')
      .attr('pointer-events', 'none');

    const centralValue = centralLabel
      .append('tspan')
      .attr('class', 'percentage')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', '-0.1em')
      .attr('font-size', `${radius / 5}px`)
      .text(dta.displayValue);

    const centralName = centralLabel
      .append('tspan')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', '1.5em')
      .attr('font-size', `${radius / 10}px`)
      .text(dta.name);

    function clicked(p) {
      parent.datum(p.parent || root);

      centralName.text(p.data.name);
      centralValue.text(p.data.displayValue);
      root.each(
        (d: any) =>
          (d.target = {
            x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            y0: Math.max(0, d.y0 - p.depth),
            y1: Math.max(0, d.y1 - p.depth),
          })
      );

      const t = g.transition().duration(750);

      path
        .transition(t)
        .tween('data', (d: any) => {
          const i = d3.interpolate(d.current, d.target);
          return (t: any) => (d.current = i(t));
        })
        .attr('fill-opacity', (d: any) => (arcVisible(d.target) ? (d.children ? 0.8 : 0.6) : 0))
        .attrTween('d', (d: any) => () => arc(d.current));

      label
        .transition(t)
        .attr('fill-opacity', (d: any) => +labelVisible(d.target))
        .attrTween('transform', (d: any) => () => labelTransform(d.current));
    }

    function arcVisible(d) {
      return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
    }

    function labelVisible(d) {
      return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
    }

    function labelTransform(d) {
      const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
      const y = ((d.y0 + d.y1) / 2) * radius;
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }
  }, [data, width, height, options.depthLimit, options.colorSchemeSetting]);

  return (
    <div
      className={cx(
        styles.wrapper,
        css`
          width: ${width}px;
          height: ${height}px;
        `
      )}
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox={`-${width / 2} -${height / 2} ${width} ${height}`}
      ></svg>
      <div style={{ pointerEvents: 'none' }} className={styles.textBox}>
        <div ref={tipRef} />
      </div>
    </div>
  );
};

const getStyles = stylesFactory(() => {
  return {
    wrapper: css`
      position: relative;
    `,
    svg: css`
      position: absolute;
      top: 0;
      left: 0;
    `,
    textBox: css`
      position: absolute;
      bottom: 0;
      left: 0;
      padding: 10px;
    `,
  };
});
