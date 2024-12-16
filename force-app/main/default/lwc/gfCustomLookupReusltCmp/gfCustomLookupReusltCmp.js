/**
 * @description       : 
 * @author            : yoseong.kang@dkbmc.com
 * @group             : 
 * @last modified on  : 2024-10-28
 * @last modified by  : yoseong.kang@dkbmc.com
 * Modifications Log
 * Ver   Date         Author                   Modification
 * 1.0   2024-10-16   yoseong.kang@dkbmc.com   Initial Version
**/
import { LightningElement, api, track } from 'lwc';

export default class CustomLookupResult extends LightningElement {
    @api	record = {};
	@api	iconName = "";
	@api	additionalFields = "";
	@api	groupField= "";
	@api	hideIcon = false;

	@track	additionalData = "";
	@track 	groupValue	= "";
	@track	hasMeta = false;
	@track	metaCss = "slds-media slds-listbox__option slds-listbox__option_entity";
	@track  iconStyleClass = "slds-icon slds-icon_small";

	connectedCallback(){
		if(this.groupField) {
			this.groupValue = this.record[this.groupField.replace("__c", "__l")] ?? this.record[this.groupField+'__l'] ?? this.record[this.groupField] ?? "";
		}

		if(this.record['isSelected']) {
			this.iconStyleClass += ' slds-icon_disabled';
		}
		if(this.additionalFields != ""){
			this.hasMeta = true;
			this.metaCss = this.metaCss + ' slds-listbox__option_has-meta';

			// Select Add Query의 toLabel(*), toFormat(*) 를 제거하고 alias 만 남도록 하는 정규식
			var listField = this.additionalFields.replaceAll(" ","").replaceAll(/to[\w\([\w\-]+?\)+/g,"").split(",");
			for(var i = 0; i < listField.length; i++){
				var key = listField[i];
				var Adata = this.record[key] ?? "";
				if(i > 0 && i !== listField.length) Adata = ' | ' + this.record[key];
				this.additionalData += Adata;
				//if(i > 0 && i != listField.length) this.additionalData += ', ';
				// console.log({'key':listField[i],'additionalData': this.additionalData});
			}
		}
	}

	selectRecord(event){
		if(this.record['isSelected']) { 

		} else {
			// Prevents the anchor element from navigating to a URL.
			event.preventDefault();
			// Creates the event with parameter
			//const selectedEvent = new CustomEvent('recordSelectedEvent', { recordByEvent : this.record });
			const selectedEvent = new CustomEvent('select', { detail : this.record });
			this.dispatchEvent(selectedEvent);
		}
	}
}