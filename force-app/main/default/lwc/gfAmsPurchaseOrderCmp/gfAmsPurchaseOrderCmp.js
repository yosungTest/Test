import { LightningElement, track, api } from 'lwc';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import tuigrid from '@salesforce/resourceUrl/dk_comm__UiBuilder';

export default class ParentComponent extends LightningElement {
    @track isModalOpen = false; // 모달 상태 관리
    @track productList = []; // 발주 목록 데이터
    @track isAddressModalOpen = false; // 주소 검색 모달 상태
    @track totalOrderAmount = 0; // 발주금액 (리스트의 제품총금액 합계)
    @track orderDate = this.getToday(); // 발주일자 기본값 (오늘 날짜)
    @api objectName;
    @api recordId;
    @api defaultValue;
    grid; // TUI Grid 객체

    columns = [
        { header: '상품코드', name: 'productCode' },
        { header: '상품명', name: 'productName' },
        { header: '발주수량', name: 'orderQuantity', editor: 'text' },
        { header: '제품가격', name: 'productPrice' },
        { header: '제품총금액', name: 'productTotalPrice' },
        {
            header: '색깔',
            name: 'color',
            copyOptions: {
                useListItemText: true
            },
            formatter: 'listItemText',
            editor: {
                type: 'radio',
                options: {
                    listItems: [
                        { text: 'Red', value: 'Red' },
                        { text: 'Blue', value: 'Blue' },
                        { text: 'Yellow', value: 'Yellow' }
                    ]
                }
            }
        },
        {   header: '직경', 
            name: 'diameter',
            copyOptions: {
                useListItemText: true
            },
            formatter: 'listItemText',
            editor: {
                type: 'radio',
                options: {
                    listItems: [
                        { text: '12.6mm', value: '126mm' }, // value 12.7 소수점 넣으면 인식불가
                        { text: '130mm', value: '23' },
                        { text: '143mm', value: '3_4' }
                    ] 
                }
            }
        },
        {   header: '재질', 
            name: 'material',
            copyOptions: {
                useListItemText: true
            },
            formatter: 'listItemText',
            editor: {
                type: 'radio',
                options: {
                    listItems: [
                        { text: 'Hydrogel', value: 'hydrogel' },
                        { text: 'Silicon Hydrogel', value: 'silicon' },
                    ]
                }
            }
        },
        // { header: '가용재고', name: 'availableStock' },
        // { header: '발주단가', name: 'unitPrice' },
        // { header: '발주수량', name: 'orderQuantity' },
        // { header: '발주금액', name: 'orderAmount' },
        // { header: '발주제약', name: 'orderRestriction' }
    ];

   // connectedCallback() {
        // TUI Grid 스크립트 및 스타일 로드
        // Promise.all([
        //     loadScript(this, `${tuigrid}/package/dist/tui-grid.js`),
        //     loadStyle(this, `${tuigrid}/package/dist/tui-grid.css`)
        // ])
        // .then(() => this.initializeGrid())
        // .catch(error => console.error('Error loading TUI Grid:', error));
    //}

    connectedCallback() {
        Promise.all([
            loadScript(this, `${tuigrid}/tuigrid/package/dist/tui-grid.js`),
            loadStyle(this, `${tuigrid}/tuigrid/package/dist/tui-grid.css`)
        ])
        .then(() => {
            console.log('TUI Grid loaded successfully');
            this.initializeGrid();
        })
        .catch(error => {
            console.error('Error loading TUI Grid:', error);
        });
    }

    initializeGrid() {
        const container = this.template.querySelector('.grid-wrapper');
        this.grid = new tui.Grid({
            el: container,
            scrollX: true,
            scrollY: true,
            columns: this.columns,
            data: this.productList,
            rowHeaders: ['checkbox'],
            editingEvent: 'click' // 편집 이벤트 설정
        });

        // 디버깅을 위한 이벤트 추가
        this.grid.on('editingStart', (event) => {
            console.log('Editing Started:', event);
            const { rowKey, columnName } = event;
            console.log('Editing Row:', this.grid.getRow(rowKey));
            console.log('Editing Column:', columnName);
        });

        this.grid.on('afterChange', (event) => {
            const { changes } = event;

            // 변경된 값을 처리
            changes.forEach((change) => {
                const { rowKey, columnName, value } = change;

                if (columnName === 'orderQuantity') {
                    // 수정된 행 데이터를 가져옴
                    const rowData = this.grid.getRow(rowKey);

                    // 제품 가격과 발주 수량을 가져옴
                    const productPrice = parseFloat(rowData.productPrice || 0); // 제품가격
                    const orderQuantity = parseFloat(value || 0); // 발주수량

                    // 제품 총 금액 계산
                    const productTotalPrice = productPrice * orderQuantity;

                    // Grid 데이터 업데이트 (해당 행의 제품총금액 수정)
                    this.grid.setValue(rowKey, 'productTotalPrice', productTotalPrice);

                    // Grid 데이터와 productList 동기화
                    this.productList = this.grid.getData();

                    // 발주금액 (합계) 업데이트
                    this.updateTotalOrderAmount();
                }
            });
        });

        // 체크박스 클릭 이벤트 리스너
        this.grid.on('check', (event) => {
            const { rowKey } = event;
            const checkedRowData = this.grid.getRow(rowKey);
            console.log('Checked Data:', JSON.stringify(checkedRowData));
        });

        this.grid.on('error', (event) => {
            console.error('TUI Grid Error:', event);
        });
    }

    updateGridData() {
        if (this.grid) {
            this.grid.resetData(this.productList);
        }
    }

    // 모든 제품총금액의 합계를 계산
    updateTotalOrderAmount() {
        this.totalOrderAmount = this.productList.reduce((total, product) => {
            const productTotalPrice = parseFloat(product.productTotalPrice || 0);
            return total + productTotalPrice;
        }, 0);
    }

    handleAddProduct() {
        this.isModalOpen = true;
    }

    handleProductSelect(event) {
        const selectedRows = event.detail.selectedRows;
        console.log('자식에게 받은 상품 데이터:', JSON.stringify(selectedRows));

        // 받은 데이터를 productList에 추가
        this.productList = [...this.productList, ...selectedRows];

        // TUI Grid 데이터 갱신
        this.updateGridData();
        this.updateTotalOrderAmount(); // 합계 갱신
        this.isModalOpen = false;
    }

    handleRemoveProduct() {
        const selectedRows = this.grid.getCheckedRows();
        console.log('삭제할 행 데이터:', selectedRows);

        if (selectedRows.length > 0) {
            // 선택되지 않은 행만 필터링
            const selectedIds = selectedRows.map(row => row.productCode);
            this.productList = this.productList.filter(
                product => !selectedIds.includes(product.productCode)
            );

            // TUI Grid 데이터 갱신
            this.updateGridData();
            this.updateTotalOrderAmount(); // 합계 갱신
        } else {
            alert('삭제할 상품을 선택하세요.');
        }
    }

    handleCloseModal() {
        this.isModalOpen = false;
    }

    handleSave() {
        console.log('저장 버튼 클릭');
    }

    // 주소 검색 버튼 클릭 시 모달 열기
    handleAddressSearch() {
        this.isAddressModalOpen = true;
    }

    // 모달 닫기 버튼 클릭 시
    handleCloseAddressModal() {
        this.isAddressModalOpen = false;
    }

    // 오늘 날짜를 "YYYY-MM-DD" 형식으로 반환
    getToday() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 +1
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 발주일자 변경 이벤트 핸들러
    handleOrderDateChange(event) {
        this.orderDate = event.target.value; // 변경된 날짜를 업데이트
    }
}