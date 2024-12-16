import { api, LightningElement } from 'lwc';
import LightningAlert from "lightning/alert";
import { FlowNavigationFinishEvent } from 'lightning/flowSupport';

export default class FlowConfirmComponent extends LightningElement {

    @api title;
    @api message;
    @api theme;
    @api actionLabel;
    _variant;
    @api availableActions = [];

 
    @api
    set isHeader(value) {
        if(value) {
           return this._variant = 'header';
        }else {
           return this._variant = 'headerless';
        } 
    }
    get isHeader() {
        return this._variant;
    }

    connectedCallback(){
        this.handleAlertOpen();
    }

    async handleAlertOpen() {
        await LightningAlert.open({
            message: this.message,
            theme: this.theme,
            label : this.title,
            variant : this._variant,
        })
        .then( result => {
            this.handleCloseFlow();
        })
    }

    handleCloseFlow() {
        if (this.availableActions.find((action) => action === 'FINISH')) {
            const navigateNextEvent = new FlowNavigationFinishEvent();
            this.dispatchEvent(navigateNextEvent);
        }
    }
}