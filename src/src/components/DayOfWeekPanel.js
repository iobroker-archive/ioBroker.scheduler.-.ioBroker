import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@mui/styles';
import { FormControl, FormControlLabel, Checkbox } from '@mui/material';

const daysOfWeek = [
    'Su',
    'Mo',
    'Tu',
    'We',
    'Th',
    'Fr',
    'Sa',
];

const dowOrderMonday = [1, 2, 3, 4, 5, 6, 0];
const dowOrderSunday = [0, 1, 2, 3, 4, 5, 6];

const styles = () => ({
    flow: {
        width: 26,
        height: 28,
        maxHeight: 28,
        minHeight: 28,
        padding: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        position: 'relative',
    },
    label: {
        color: props => props.theme.palette.text.primary,
        marginLeft: 0,
        marginRight: 12,
    },
});

class DayOfWeekPanel extends Component {
    render() {
        const { flow, label } = this.props.classes;
        const dowOrder = this.props.firstDayOfWeek === 'monday' ? dowOrderMonday : dowOrderSunday;

        return <FormControl component="fieldset" style={{ marginRight: 12 }}>
            {dowOrder.map(index => <FormControlLabel
                style={{ marginLeft: 6 }}
                key={index}
                control={
                    <Checkbox
                        checked={this.props.dow.includes(index)}
                        color="primary"
                        className={flow}
                        onChange={e => this.props.onChange(index, e.target.checked)}
                    />
                }
                label={this.props.t(daysOfWeek[index])}
                className={label}
            />)}
            {this.props.holidayVisible ? <FormControlLabel
                style={{ marginLeft: 6 }}
                control={
                    <Checkbox
                        checked={!!this.props.holiday}
                        color="primary"
                        className={flow}
                        onChange={e => this.props.onChange('holiday', e.target.checked)}
                    />
                }
                label={this.props.t('Holiday')}
                className={label}
            /> : null}
        </FormControl>;
    }
}

DayOfWeekPanel.propTypes = {
    dow: PropTypes.array,
    holiday: PropTypes.bool,
    holidayVisible: PropTypes.bool,
    onChange: PropTypes.func,
    firstDayOfWeek: PropTypes.string,
    t: PropTypes.func.isRequired,
};

export default withStyles(styles)(DayOfWeekPanel);
