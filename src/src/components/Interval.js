import PropTypes from 'prop-types';
import { Component } from 'react';
import { withStyles, makeStyles } from '@material-ui/core/styles';
import Slider from '@material-ui/core/Slider';
import minmax from '../data/minmax.json';

const styles = () => ({

});
const usePrettoSliderStyles = makeStyles({
    root: props => ({
        color: props.theme.palette.primary.dark,
        width: `${props.intervalsWidth}px!important`,
        borderRadius: 0,
        height: 'calc(100% - 90px)!important',
        transition: 'all 100ms ease-out',
        position: 'relative',
    }),
    thumb: props => ({
        left: `calc( 50% + ${10}px)!important`,
        width: 0,
        height: 0,
        display: props.type === 'onoff' ? 'none' : 'flex',
    }),
    active: {
        backgroundColor: 'transparent',
        width: 0,
        height: 0,

    },
    valueLabel: props => ({
        left: -20,
        '& *': {
            background: 'transparent',
            fontWeight: 100,
            color: props.theme.palette.text.primary,
            fontSize: '1.0rem',
            transition: 'all 100ms ease-out',
        },
    }),
    track: {
        width: '90%!important',
        transition: 'all 100ms ease-out',
        borderRadius: 4,
    },
    rail: props => ({
        transition: 'all 100ms ease-out',
        width: '90%!important',
        borderRadius: 4,
        borderBottomLeftRadius: '0px!important',
        borderBottomRightRadius: '0px!important',
        height: `calc(100% + ${props.intervalsWidth}px)`,
        backgroundColor: props.theme.palette.primary.light,
    }),
});

const PrettoSlider = props => {
    const componentProps = { ...props };
    delete componentProps.intervalsWidth;
    delete componentProps.type;
    delete componentProps.theme;
    return (
        <Slider
            classes={
                usePrettoSliderStyles({
                    intervalsWidth: props.intervalsWidth,
                    type: props.type,
                    theme: props.theme,
                })
            }
            {...componentProps}
        />
    );
};
class Interval extends Component {
    handleSliderChange = (event, data) => {
        this.on('data', data);
    }

    handleSelected = () => {
        this.on('selected', !this.props.selected);
    }

    on = (field, value) => {
        if (this.props.on) {
            this.props.on(field, value, this.props.i);
        }
    }

    getPostfix(value) {
        switch (this.props.type) {
            case 'temperature':
                return `${value.toString()}º`;
            case 'onoff':
                return value
                    ? <span style={this.props.theme.palette.text.success}>on</span>
                    : <span style={this.props.theme.palette.text.danger}>off</span>;
            case 'percent':
            default:
                return `${value.toString()}%`;
        }
    }

    getMinMax() {
        return minmax[this.props.type];
    }

    getLabel = () => {
        const { step, i } = this.props;
        const label = i * step;
        const hrs = parseInt(label);
        const secs = (`0${(label % 1) * 60}`).slice(-2);
        return [hrs, secs];
    }

    render() {
        const {
            value, i, selected, theme, intervalsWidth, type,
        } = this.props;
        console.log(this.props.theme)
        if (i < 0) {
            return '';
        }
        const { min, max } = this.getMinMax();
        const label = this.getLabel();
        const val = !value ? 0 : value;
        const vl = type === 'onoff' ? this.getPostfix(val || 0) : '';
        const v2 = type !== 'onoff' ? this.getPostfix(val || 0) : '';
        return (
            <span className="pretto">
                <span className="pretto-label">
                    {vl}
                </span>
                <PrettoSlider
                    key={i}
                    theme={theme}
                    intervalsWidth={intervalsWidth}
                    type={type}
                    orientation="vertical"
                    aria-label="pretto slider"
                    value={val}
                    valueLabelFormat={v2}
                    min={min}
                    max={max}
                    selected={selected}
                    onChange={this.handleSliderChange}
                    valueLabelDisplay="on"
                />
                <div
                    className={`pretto-time flow-square${selected ? ' active' : ''}`}
                    style={{}}
                    i={i}
                    onClick={this.handleSelected}
                >
                    <span>{label[0]}</span>
                    <span className="pretto-secs">{label[1]}</span>

                </div>
            </span>
        );
    }
}

Interval.propTypes = {
    i: PropTypes.number,
    intervalsWidth: PropTypes.number,
    on: PropTypes.func,
    selected: PropTypes.bool,
    step: PropTypes.number,
    theme: PropTypes.object,
    type: PropTypes.string,
    value: PropTypes.number,
};
export default withStyles(styles)(Interval);