import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from "lightning/navigation";
import { FlowNavigationFinishEvent } from 'lightning/flowSupport';
import { encodeDefaultFieldValues } from 'lightning/pageReferenceUtils';

export default class GfCommonFlowCmp extends NavigationMixin(LightningElement) {

    @api objectName;
    @api recordId;
    @api defaultValue; // JSON형태 (예: {"PartnerType__c": "DeliveryCompany"})

    connectedCallback() {
        this.handleGoFinish();
        if (this.recordId == null && this.defaultValue == null) {  
            this.handleNew();
        } else if(this.recordId == null && this.defaultValue != null) {
            this.handleNewDefault();
        } else {  
            this.handleEdit();
        }
    }
    handleNew() {
        this[NavigationMixin.Navigate]({
            type: "standard__objectPage",
            attributes: {
                objectApiName: this.objectName,
                actionName: "new",
            },
            state: {
                useRecordTypeCheck: 'true',
            }
        });
    }
    handleNewDefault() {
        const parsedDefaultValues = JSON.parse(this.defaultValue);
        const defaultValues = encodeDefaultFieldValues(parsedDefaultValues);
        this[NavigationMixin.Navigate]({
            type: "standard__objectPage",
            attributes: {
                objectApiName: this.objectName,
                actionName: "new",
            },
            state: {
                useRecordTypeCheck: 'true',
                defaultFieldValues: defaultValues
            }
        });
    }
    handleEdit() {
        this[NavigationMixin.Navigate]({
            type: "standard__recordPage",
            attributes: {
                recordId: this.recordId,
                objectApiName: this.objectName,
                actionName: "edit",
            },
        });
    }
    handleGoFinish() {
        const navigateFinishEvent = new FlowNavigationFinishEvent();
        this.dispatchEvent(navigateFinishEvent);
    }
}