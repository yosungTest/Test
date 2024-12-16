import { api, track } from 'lwc';
import LightningModal from 'lightning/modal';
import LightningAlert from 'lightning/alert';

// Apex
import searchProducts from '@salesforce/apex/GfProductSearchMoadlController.searchProducts';

const COLUMNS = [
    { label: 'Code', fieldName: 'productCode',  hideDefaultActions : true},
    { label: 'Name', fieldName: 'productUrl', type:'url', typeAttributes : { label : { fieldName:'productName' }, target : '_blank' }, hideDefaultActions : true},
    { label: 'Name Eng', fieldName: 'soldToName',  hideDefaultActions : true},
    { label: 'Price', fieldName: 'productPrice',  hideDefaultActions : true},
    { label: 'Unit', fieldName: 'unit', hideDefaultActions : true},
    { label: 'Tax Type', fieldName: 'taxType',  hideDefaultActions : true},
];

export default class GfProductSearchMoadl extends LightningModal {
    @track dataList = [];

    columns = COLUMNS;
    searchKeyWord;

    isDataList = false;
    isSpinner = false;
    isAllChecked = false;

    get isDisabled() {
        return !this.isDataList;
    }

    /**
     * 키워드 입력시 실행되는 함수
     */
    handleChangeKeyWord(event) {
        this.searchKeyWord = event.detail.value;
    }

    /**
     * Search 버튼 클릭시 실행되는 함수
     */
    handleClickSearch() {
        this.isSpinner = true;
        searchProducts({"searchKeyWord" : this.searchKeyWord})
        .then(result => {
            if(result && result.length > 0) {
                result.forEach( item => {
                    item.productPrice = new Intl.NumberFormat("ko", { style: "currency", currency: "KRW" }).format(item.productPrice);
                })
                this.dataList = JSON.parse(JSON.stringify(result));
                this.isDataList = true
            }else {
                this.isDataList = false
            }
        })
        .catch( error => {
            console.log('error: ', error);
        })
        .finally(()=> {
            this.isSpinner = false;
        })
    }

    /**
     * 체크박스 선택시 실행되는함수
     * @param {*} event 
     */
    handleSelectedRow(event) {
        let name = event.target.name;
        let checked = event.target.checked;
        let index = event.target.dataset.index;
        if(index) {
            this.dataList[index][name] = !checked;       
        }
        // 이벤트 버블링으로 인해 체크박스 함수 두번 실행되서 그걸 막기위해 사용
        event.preventDefault();
        
    }

    /**
     * 전체 체크박스 선택/해제시 실행되는 함수
     * @param {*} event 
     */
    handleSelectAll(event) {
        let checked = !this.isAllChecked
        this.dataList = this.dataList.map(item => {
            return {...item, 'isChecked' : checked};
        });
        this.isAllChecked = checked;
        event.preventDefault();
    }

    /**
     * 저장 버튼 클릭시 실행되는 함수
     */
    handleSave() {
        let selectedDataList = [];
        if(this.dataList && this.dataList.length > 0) {
            selectedDataList = this.dataList.filter( item => item.isChecked == true);
        }
        if(selectedDataList.length > 0) {
            this.close({'selectedData' : selectedDataList});
        }else {
            this.handleAlertClick('Warning', '제품을 선택해주세요','warning');
        }
    }

    handleCancel() {
        this.close();
    }

    /**
     * 경고 창 
     * @param {String} title 
     * @param {String} message 
     * @param {String} theme 
     */
    async handleAlertClick(title, message, theme) {
        const result = await LightningAlert.open({
            label : title,
            message: message,
            theme : theme
        });
    }
}