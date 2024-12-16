/**
 * @description       : 
 * @author            : mingyoon.woo 
 * @group             : 
 * @last modified on  : 2024-12-04
 * @last modified by  : yoseong.kang@dkbmc.com
 * Modifications Log 
 * Ver   Date         Author                             Modification
 * 1.0   2021-06-30   mingyoon.woo    					Initial Version
 * 1.1   2021-10-13   hyojinn.lee     					connectedCallback() 변수 초기화시 disabled,required String 변환
 * 1.2   2024-04-22   hyojinn.lee     					groupField, hideIcon 속성 추가
 * 1.3   2024-10-23   nayoung.park						앨범,트랙,뮤비,아티스트,음반일 경우 Name대신 FullName__c 사용되도록 수정
**/
import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent'
import initComponent from '@salesforce/apex/GfCustomLookupController.initComponent';
import queryRecords from '@salesforce/apex/GfCustomLookupController.queryRecords';
import getCreatedRecord from '@salesforce/apex/GfCustomLookupController.getCreatedRecord';

//export default class CustomLookup extends LightningElement {
export default class CustomLookup extends NavigationMixin(LightningElement) {
	// required parameters
	@api	objectName = '';					// Object API Name
	@api	iconName = '';						// Object Icon Name
	@api	selectedRecords = [];				// Selected Records if enableMultiRecord is true
			_selectedRecord = {};				// Selected Record if enableMultiRecord is false
	// optional parameters
	@api	label;
	@api	required = false;					// mark required
	@api	minimum = 2;						// minimum number of characters to query
	@api	additionalDisplays = '';			// additional display fields, comma seperated, max 2
	@api	additionalSelect = '';				// add Select Query Field (!must exclude additionalDisplay field, Id, Name)
	@api	searchFields = '';					// additional search targets, comma seperated, max 3
	@api	filterFields = '';
	@api	filterValues = '';
	@api	filterConditions = '';
	@api	filterExpression = '';
	@api	recordTypeNames = '';
	@api	ownedOnly = false;
	@api	orderBy = '';
	@api	numOfQuery = '100'
	@api	enableNewRecord = false;
	@api	enableMultiObject = false;
	@api	multiObjectList = [];
	@api	enableMultiRecord = false;
	@api	isIgnoredDuplicatedRule = false;
	@api	disabled = false;
	@api	enablePreSearch = false;		// pre searched Result by Filtering [limit 500]
	@api	groupField = '';				// [1] Group by Field (*Require Orderable Field Type)
	@api	hideIcon = false;
	@api	requiredBorder = false;

	// internally used variables, need re-render component
	@api    placeholder = null;
	@track  objectLabel = '';
	@track  searchRecords = [];
	@track  message = '';
	@track  hasMeta = false;
	@track  searchClass = '';
	@track  lookupPillClass = '';
	@track  lookupFieldClass1 = '';
	@track  lookupFieldClass2 = '';
	@track	hasSelectedRecords = false;
	@track 	focusCounter = null;
	@track 	isDropdownOpen = false;
	@track	showSpinner = false;

	// 상위 컴포넌트에서 초기값이 undefined로 설정됐을 때 에러 방지를 위해 Getter / Setter를 활용
	@api
	get selectedRecord() {
		return this._selectedRecord;
	}

	set selectedRecord(value) {
		if(value) {
			this._selectedRecord = value;
		} else{
			this._selectedRecord = {};
		}
	}

	createWin;
	_searchText;
	preSearchRecords = [];
	_isPreSearched = false;
	isUpCounter = false;
	@track isUsingGroupField = false;

	get tempSearchRecords() {
		return this.mappedSearchRecords(this.searchRecords);
	}

	/**
	 * **********************************************
	 * doInit of Aura Component (controller + helper)
	 * **********************************************
	 */
	connectedCallback(){
		if(typeof this.required == 'boolean') this.required = JSON.stringify(this.required);
		if(typeof this.disabled == 'boolean') this.disabled = JSON.stringify(this.disabled);

		this.required = this.required == 'true' ? true : false;
		this.ownedOnly = this.ownedOnly == 'true' ? true : false;
		this.enableNewRecord = this.enableNewRecord == 'true' ? true : false;
		this.enableMultiObject = this.enableMultiObject == 'true' ? true : false;
		this.enableMultiRecord = this.enableMultiRecord == 'true' ? true : false;
		this.isIgnoredDuplicatedRule = this.isIgnoredDuplicatedRule == 'true' ? true : false;
		this.disabled = this.disabled == 'true' ? true : false;
		this.isUsingGroupField = this.groupField ? true : false;
		// console.log('label ' + this.label + ' : ' + this.isUsingGroupField);

		this.searchClass = 'slds-is-close slds-form-element slds-lookup';
		this.lookupPillClass = 'slds-form-element__control slds-hide';
		this.lookupFieldClass1 = 'slds-show slds-input-has-icon slds-input-has-icon_right';
		this.lookupFieldClass2 = 'slds-show slds-box_border slds-input-has-icon slds-input-has-icon_right';
		

		if(this.enablePreSearch){
			this.numOfQuery = '500';
			this.minimum = 0;
			if(this._isPreSearched == false) { 
				this.queryRecords('');
				this._isPreSearched = true;
			}
			// console.log('connectedCallback');
		}

		/** 상위컴포넌트에서 selectedRecords를 받아올경우 받아온 List를 수정하는것이 불가능하므로 bind 함수 추가
		 * modified on  : 09-06-2021
		 * modified by  : seunghwan.ryu@dkbmc.com
		 *  **/
		// bind selectedRecords from parents Component
		this.handleBindRecords();  

		// doInit part of helper of Aura
		if(this.checkMultiObject() && this.checkRequired() && this.checkAdditionalFields() && this.checkAdditionalDisplays()
			&& this.checkSearchFields() && this.checkFilters() && this.checkOrderBy()){
			
			initComponent({ objectName : this.objectName })
				.then(result => {
					this.objectLabel = result;
					this.placeholder = this.placeholder ??= 'Search in ' + this.objectLabel;
				})
				.catch(errors => {
					this.errorHandler(errors);
				});
		}

	}


	/**
	 * **********************************************
	 * Controller part of Aura Component
	 * **********************************************
	**/
	/* onFocus, becuase LWC do not allow start with 'on' */
	handleFocus(event){
		// console.log('handleFocus');
		// this.searchClass = 'slds-is-open slds-form-element slds-lookup';

		this.listToggleHelper('on');
		this.isDropdownOpen = true;

		if(this.enablePreSearch && !this._searchText && event.key !== 'Enter') {
			// console.log('# enablePreSearch');
			this.isDropdownOpen = true;
			this.queryRecords('');
		}
	}

	/* onBlur, becuase LWC do not allow start with 'on' */
	handleBlur(){
		// console.log('handleBlur');
		this.listToggleHelper('off');
		this.focusCounter = null;
	}

	/* onKeyup, becuase LWC do not allow start with 'on' */
	async handleChange(event){
		event.preventDefault();
		var searchText = event.target.value;
		// console.log('changed ->', searchText);
		if(searchText.length > this.minimum - 1){
			this.listToggleHelper('on');
			this.isDropdownOpen = true;

			if(this._searchText != searchText) await this.queryRecords(searchText);
			this._searchText = searchText;

			if(this.enablePreSearch) {
				// this.preSearchRecords = this.filterPreSearched(searchText);
				// console.log(`💟this.preSearchRecords : ${this.preSearchRecords}`);
				if(this.searchRecords.length > 0 && searchText.length > 0) this.focusCounter = 0;
			}
		}

		if (event.key == 'Escape') {
			this.listToggleHelper('off');
		}
	}

	// bind selectedRecords from parents Component
	handleBindRecords(){
		if(this.enableMultiRecord){
			var records = [];
			this.selectedRecords.forEach(item => {
				records.push(item);
			});
			this.selectedRecords = records;
		}
	}

	/**
	 * key down event
	 * @param {*} event 
	 */
	handleKeyDown(event) {
		if (event.key == 'Escape') {
			this.listToggleHelper('off');

		} else if (event.key === 'Enter' && this.focusCounter != null && !isNaN(this.focusCounter)) {
			this.recordSelected(this.searchRecords[this.focusCounter]);
			this._searchText = null;
		}

		if (event.key === 'ArrowDown' || event.key === 'PageDown') {
			if(this.searchRecords.length === 0) { 
				this.handleFocus(event) 
			}
			this.focusCounter = ( this.focusCounter === null || isNaN(this.focusCounter) ) ? 0 : this.focusCounter + 1;
			this.isUpCounter = true;
			this.listToggleHelper('on');

		} else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
			// this._inputHasFocus = true;
			this.focusCounter = !this.focusCounter ? this.searchRecords.length - 1 : this.focusCounter - 1;
			this.isUpCounter = false;
			this.listToggleHelper('on');
		}

		if (event.key === 'ArrowDown' || event.key === 'ArrowUp'  || event.key === 'PageDown' || event.key === 'PageUp') {
			this.focusCounter = Math.abs(this.focusCounter) % this.searchRecords.length;
		}

		if (event.key === 'Home') {
			this.focusCounter = 0;
			this.isUpCounter = true;

		} else if (event.key === 'End') {
			this.focusCounter = this.searchRecords.length - 1;
			this.isUpCounter = false;
		}

		console.log(`# this.focusCounter : ${this.focusCounter}`);
	}

	handleResultMouseDown(event) {
		if(event.currentTarget.dataset.isSelected) { // 이미 선택된 아이템인 경우, Prevent blur Event 
			event.preventDefault();
		}
	}
	
	handleResultBarClick(event){
		event.preventDefault();
	}

	doScroll(event) {
		event.preventDefault();
		this.timeout = setTimeout(function(e){
			listToggleHelper('on');
		}.bind(this), 510);
	}

	@api
	resetData(){
		this.lookupPillClass = 'slds-form-element__control slds-hide';
		this.lookupFieldClass1 = 'slds-show slds-input-has-icon slds-input-has-icon_right';
				
		this.template.querySelector('[data-search-input]').value = '';
		this.selectedRecord = {};
		this.searchRecords = [];
	}

	clear(event){
		var detail;

		if(this.enableMultiRecord){
			var recordId = event.currentTarget.getAttribute('data-item-id'),
				records = [...this.selectedRecords],
				removeIdx;

			for(var i=0;i<records.length;i++){
				if(recordId == records[i].Id) removeIdx = i;
			}
			
			records.splice(removeIdx, 1);
			
			this.template.querySelector('[data-search-input]').value = '';
			this.selectedRecords = records;
			this.searchRecords = [];
			detail = this.selectedRecords;

			if(records.length == 0){
				this.hasSelectedRecords = false;
				this.lookupPillClass = 'slds-form-element__control slds-hide';
				this.lookupFieldClass2 = 'slds-show slds-box--border slds-input-has-icon slds-input-has-icon_right';
			}
		} else {
			this.lookupPillClass = 'slds-form-element__control slds-hide';
			this.lookupFieldClass1 = 'slds-show slds-input-has-icon slds-input-has-icon_right';
					
			this.template.querySelector('[data-search-input]').value = '';
			this.selectedRecord = {};
			this.searchRecords = [];
			detail = this.selectedRecord;
		}

		// Creates the event with parameter
		// const selectedEvent = new CustomEvent('recordSelectedEvent', { recordByEvent : this.record });
		const changedEvent = new CustomEvent('change', { detail : detail });

		// Dispatches the event.
		this.dispatchEvent(changedEvent);
	}

	recordSelectedEventHandler(event){
		try{
			var recordFromEvent = event.detail;
			console.log('>> recordSelectedEventHandler.recordFromEvent', JSON.stringify(recordFromEvent));	   
			this.recordSelected(recordFromEvent);
			this._searchText = null;
		} catch (error){
			console.log('error', error);
		}
		
	}

	// Using NavigationMixin
	createNewRecord(event){
		let evt = {
			type: 'standard__objectPage',
			attributes: {
				objectApiName: this.objectName,
				actionName: 'new'
			},
			state: {
				nooverride: '1'
			}
		};
		//this[NavigationMixin.Navigate](evt);
		this[NavigationMixin.GenerateUrl](evt)
			.then(url => {
				console.log('url ->', url);
				this.createWin = window.open(url, '_blank');
				// This callback does not work!!!
				this.createWin.onbeforeunload = function(){
					console.log('onbeforeunload');
					this.getCreatedRecord();
				}
			});
	}

	objectSelect(event){
		event.preventDefault();
		let selectedObject = event.detail.value;
		this.multiObjectList.forEach(item => {
			if(item.value == selectedObject){
				this.objectName = item.value;
				this.objectLabel = item.label;
				this.iconName = item.iconName;
				this.placeholder = this.placeholder ??= 'Search in ' + this.objectLabel;
			}
		});
	}

	// on-render handler of Aura Component
	renderedCallback(){
		this.template.querySelector("[data-focused=true]")?.scrollIntoView({ block: "nearest" });

		if(this.selectedRecord.Name != undefined){
			this.lookupPillClass = 'slds-form-element__control slds-show';
			this.lookupFieldClass1 = 'slds-hide slds-input-has-icon slds-input-has-icon_right';
		}
		if(Array.isArray(this.selectedRecords) && this.selectedRecords.length > 0) {
			this.hasSelectedRecords = true;
			this.lookupPillClass = 'slds-form-element__control slds-show';
			if(!this.enableMultiRecord) {
				this.lookupFieldClass2 = 'slds-hide slds-box--border slds-input-has-icon slds-input-has-icon_right';
			}
		}
	}

	/**
	 * **********************************************
	 * Helper part of Aura Component
	 * **********************************************
	 */
	checkMultiObject(){
		if(this.enableMultiObject){
			if(this.multiObjectList == null || this.multiObjectList.length < 1){
				this.showMyToast('error', 'CustomLookup Error', 'Need to set multiObjectList for using Multiple Object. Lookup disabled!!');
				this.disabled = true;
				return false;
			}
			if(this.searchFields != ''){
				this.showMyToast('warning', 'CustomLookup Alert', 'Can not use searchFields with multiObject. searchFields cleared!!');
				this.searchFields = '';
			}
			if(this.additionalSelect != ''){
				this.showMyToast('warning', 'CustomLookup Alert', 'Can not use additionalSelect with multiObject. additionalSelect cleared!!');
				this.additionalSelect = '';
			}
			if(this.additionalDisplays != ''){
				this.showMyToast('warning', 'CustomLookup Alert', 'Can not use additionalDisplays with multiObject. additionalDisplays cleared!!');
				this.additionalDisplays = '';
			}
			if(this.filterFields != '' || this.filterExpression != ''){
				this.showMyToast('warning', 'CustomLookup Alert', 'Can not use Filter with multiObject. Filter cleared!!');
				this.filterFields = '';
				this.filterValues = '';
				this.filterConditions = '';
				this.filterExpression = '';
			}
			if(this.recordTypeNames != ''){
				this.showMyToast('warning', 'CustomLookup Alert', 'Can not use recordTypeNames with multiObject. recordTypeNames cleared!!');
				this.recordTypeNames = '';
			}

			this.objectName = this.multiObjectList[0].value;
			this.objectLabel = this.multiObjectList[0].label;
			this.iconName = this.multiObjectList[0].iconName;
		}
		return true;
	}

	checkRequired(){
		if(this.objectName == '' || this.iconName == ''){
			this.showMyToast('error', 'CustomLookup Error', 'objectName, iconName are required. Lookup disabled!!');
			this.disabled = true;
			return false;
		}
		return true;   
	}

	checkAdditionalFields(){
		if(this.additionalSelect != ''){
			var listField = this.additionalSelect.split(',');
			if(listField.length > 2){
				this.showMyToast('error', 'CustomLookup Error', 'The additionalField only accept maximum 2 fields. Lookup disabled!!');
				this.disabled = true;
				return false;
			}
			this.hasMeta = true;
		}
		return true;
	}

	checkAdditionalDisplays(){
		if(this.additionalDisplays != ''){
			var listField = this.additionalDisplays.split(',');
			if(listField.length > 2){
				this.showMyToast('error', 'CustomLookup Error', 'The additionalDisplays only accept maximum 2 fields. Lookup disabled!!');
				this.disabled = true;
				return false;
			}
			this.hasMeta = true;
		}
		return true;
	}

	checkSearchFields(){
		if(this.searchFields != ''){
			var listField = this.searchFields.split(',');
			if(listField.length > 2){
				this.showMyToast('error', 'CustomLookup Error', 'The searchField only accept maximum 3 fields. Lookup disabled!!');
				this.disabled = true;
				return false;
			}
		}
		return true;
	}

	checkFilters(){
		if(this.filterFields != ''){
			var listField = this.filterFields.split(','),
				listValue = this.filterValues.split(','),
				listCondition = this.filterConditions.split(',');
			if(listField.length != listValue.length || listField.length != listCondition.length){
				this.showMyToast('error', 'CustomLookup Error', 'The number of filter fields, values and conditions must match. Lookup disabled!!');
				this.disabled = true;
				return false;
			}
		}
		return true;
	}

	checkOrderBy(){
		if(this.orderBy != ''){
			var listField = this.orderBy.split(',');
			if(listField.length > 2){
				this.showToast('error', 'CustomLookup Error', 'Additional order by fields accept maximum 3. Lookup disabled!!');
				this.disabled = true;
				return false;
			}
		}
		return true;
	}

	async queryRecords(searchText){
		this.spinnerToggle();
		await queryRecords({
				'searchKeyword': searchText,
				'objectName' : this.objectName,
				'searchFields' : this.searchFields,
				'additionalDisplay' : this.additionalDisplays,
				'additionalSelect' : this.additionalSelect,
				'filterFields' : this.filterFields,
				'filterValues' : this.filterValues,
				'filterConditions' : this.filterConditions,
				'filterExpression' : this.filterExpression,
				'recordTypeNames' : this.recordTypeNames,
				'onlyOwned' : this.ownedOnly,
				'groupField' : this.groupField,
				'orderBy' : this.orderBy,
				'numLimit' : this.numOfQuery
			})
			.then(result => {
				// console.log('queryRecords ->', result);

				if(result.length == 0){
					this.message = 'No Result Found...';
					this.focusCounter = null;
				} else {
					if(this.objectName == 'Album__c' || this.objectName == 'Track__c' || this.objectName == 'MV__c' || this.objectName == 'Artist__c' || this.objectName == 'CollectAlbum__c'){
						result.forEach(item => {
							item.Name = item.FullName__c;
						});
					}
					this.message = '';
				}
				this.searchRecords = result;
				this.spinnerToggle();
			})
			.catch(errors => {
				this.errorHandler(errors);
				this.spinnerToggle();
			});
	}

	getCreatedRecord(){
		console.log('callback executed....');
		getCreatedRecord({ 'objectName' : this.objectName })
			.then(result => {
				console.log('getCreatedRecord ->', result);
				if(result != null)
					this.selectedRecord = result;
			})
			.catch(errors => {
				this.errorHandler(errors);
			});
	}

	recordSelected(record){
		var detail;
		this.focusCounter = null;
		
		if(this.enableMultiRecord){
			if(Array.isArray(this.selectedRecords)){
				let records = [...this.selectedRecords];
				records.push(record);
				this.selectedRecords = records;
				detail = records;
			} else {
				this.selectedRecords = new Array();
				this.selectedRecords.push(record);
				detail = this.selectedRecords;
			}
			if(this.selectedRecords.length > 0) this.hasSelectedRecords = true;
		} else {
			this.lookupPillClass = 'slds-form-element__control slds-show';
			this.lookupFieldClass1 = 'slds-hide slds-box--border slds-input-has-icon slds-input-has-icon_right';

			this.selectedRecord = record;
			detail = this.selectedRecord;
		}
		this.listToggleHelper('off');

		// this.searchClass = 'slds-is-close slds-form-element slds-lookup';
		// this.isDropdownOpen = false;

		this.template.querySelector('[data-search-input]').value = '';
		this.searchRecords = [];
		// Creates the event with parameter
		// const selectedEvent = new CustomEvent('recordSelectedEvent', { recordByEvent : this.record });
		// Dispatches the event.
		const changedEvent = new CustomEvent('change', { detail : detail });
		this.dispatchEvent(changedEvent);
	}

	mappedSearchRecords(records) {
		let isGrouped = this.groupField ? true : false;
		var tempGroupValue = '';
		var mappedRecords = records.map((record, index) => {
			var isSelected = false;
			var isFirstGroupItem = false;
			var groupValue;
			if(isGrouped) {
				groupValue = record[this.groupField];
				isFirstGroupItem = tempGroupValue !== groupValue;
				tempGroupValue = groupValue;
			}

			for(let i in this.selectedRecords) {
				// this.selectedRecords[i]['groupFieldValue'] = this.selectedRecords[i][this.groupField];
				if(this.selectedRecords[i].Id === record.Id) { 
					isSelected = true;
				}
			}
			if((index === this.focusCounter) && isSelected) {
				if(this.isUpCounter) {
					this.focusCounter = this.focusCounter+1;
				} else {
					this.focusCounter = this.focusCounter-1;
				}
			}
			
			return { ...record, isFocused: (index === this.focusCounter), isSelected, isFirstGroupItem };
		});

		// Reverse
		for (let index = mappedRecords.length-1; index > 0; index--) {
			if((this.focusCounter === index) && mappedRecords[index].isSelected) {
				if(!this.isUpCounter) {
					this.focusCounter = this.focusCounter-1;
				}
			}
			mappedRecords[index].isFocused = (index === this.focusCounter);
		}

		// console.log('# mappedSearchRecords : ', mappedRecords);
		return mappedRecords;
	}

	/**
	 * enablePreSearch = true 사용 시, Query 사용하지 않고 기검색된 리스트 SearchRecords에서 String 값 비교 검색
	 * @param {string} searchString 
	 */
	filterPreSearched(searchString) {
        // if( searchString && searchString.length > 0 ) {
            // if(searchString.length >= this.minimum) {
                for(var i = 0; i < this.tempSearchRecords.length; i++) {
					// Name 비교
					console.log(`this.tempSearchRecords[i].name : ${this.tempSearchRecords[i].name}`);
					if(this.tempSearchRecords[i].name.toLowerCase().trim().includes(searchString.toLowerCase().trim()) ) {
						this.tempSearchRecords[i].isVisible = true;
                    } 
					// 추가 SearchField 비교
					if(this.searchFields) {
						var searchFieldArr = this.searchFields.split(',');
						for(var searchField in searchFieldArr) {
							searchField = searchField.trim();
							searchField = searchField.replace('toLabel(', '').replace(')', '');
	
							if(this.tempSearchRecords[i][searchField].toLowerCase().trim().includes(searchString.toLowerCase().trim())) {
								this.tempSearchRecords[i].isVisible = true;
							}
						}
					}
                }
            // }
        //     this.showDropdown = true;
        // } else {
        //     this.showDropdown = false;
        // }
	}

	listToggleHelper(mode){
		// console.log('💬 listToggleHelper.mode ==> ', mode);

		// this.timeout = setTimeout(function(e){
			if(mode == 'on'){
				// resultList open
				this.searchClass = 'slds-is-open slds-form-element slds-lookup';
				this.isDropdownOpen = true;
			} else {
				// resultList close
				this.searchClass = 'slds-is-close slds-form-element slds-lookup';
				this.isDropdownOpen = false;

			}
		// }.bind(this), 500);
	}

	// Spinner toggle
	spinnerToggle(){
		this.showSpinner = !this.showSpinner
	}

	errorHandler(errors){
		if(Array.isArray(errors)){
			errors.forEach(error => {
				this.showMyToast('error', 'Error', error.message, 'sticky');
			})
		} else {
			console.log(errors);
			this.showMyToast('error', 'Error', 'Unknown error in javascript controller/helper.', 'sticky');
		}
	}

	showMyToast(variant, title, msg, mode){
		let dismissible = mode != undefined ? mode : 'dismissible';
		const event = new ShowToastEvent({
			'variant' : variant,
			'title' : title,
			'message' : msg,
			'mode' : dismissible
		});
		this.dispatchEvent(event);
	}
}