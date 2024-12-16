import { LightningElement, track } from 'lwc';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import tuigrid from '@salesforce/resourceUrl/dk_comm__UiBuilder';
import searchProducts from '@salesforce/apex/GfListViewController.searchProducts';

export default class ProductGridWithSelect extends LightningElement {
    gridInitialized = false;
    gridData = [];
    searchValue = ''; // 검색 입력값
    selectedRows = []; // 선택된 행의 데이터

    columns = [
        { header: '상품코드', name: 'productCode', editor: false },
        { header: '상품이름', name: 'productName', editor: false },
        { header: '제품가격', name: 'productPrice', editor: false },
    ];

    connectedCallback() {
        Promise.all([
            loadScript(this, `${tuigrid}/tuigrid/package/dist/tui-grid.js`),
            loadStyle(this, `${tuigrid}/tuigrid/package/dist/tui-grid.css`)
        ])
        .then(() => this.initializeGrid())
        .catch(error => console.error('Error loading resources:', error));
    }

    handleSearchInputChange(event) {
        this.searchValue = event.target.value;
    }

    handleSearch() {
        this.loadGridData(this.searchValue);
    }

    async loadGridData(searchValue) {
        try {
            const products = await searchProducts({ searchValue });
            this.gridData = products.map(product => ({
                id: product.id,
                productCode: product.productCode,
                productName: product.productName,
                productPrice: product.productPrice,
                color: product.color,
                diameter: product.diameter,
                material: product.material,
            }));
            this.updateGridData();
        } catch (error) {
            console.error('Error fetching product data:', error);
        }
    }

    initializeGrid() {
        this.grid = new tui.Grid({
            el: this.template.querySelector('.grid-container'),
            scrollX: true,
            scrollY: true,
            rowHeaders: ['checkbox'], // 체크박스 추가
            columns: this.columns,
            data: this.gridData // 초기 데이터 설정
        });
    }
    
    updateGridData() {
        if (this.grid) {
            this.grid.resetData(this.gridData); // 데이터를 리셋하여 업데이트
        }
    }

    handleSelect() {
        const checkedRows = this.grid.getCheckedRows(); 
        // const selectedIds = checkedRows.map(row => row.id); 
        // const plainSelectedIds = Array.from(selectedIds); 
        console.log('선택된 행 데이터:', JSON.stringify(checkedRows)); 
    
        // 부모 컴포넌트로 데이터 전달
        const selectEvent = new CustomEvent('recordselect', {
            detail: { selectedRows: checkedRows } 
        });
        this.dispatchEvent(selectEvent);
    }
}