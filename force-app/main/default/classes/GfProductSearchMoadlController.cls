public with sharing class GfProductSearchMoadlController {

    /**
     * 제품 서치 메소드
     * @param {String} searchValue 
     * @return  `List<WrapperClass>`
     */
    @AuraEnabled
    public static List<WrapperClass> searchProducts(String searchKeyWord) {
        List<WrapperClass> resultList = new List<WrapperClass>();
        try {
            String searchFilter = String.isNotBlank(searchKeyWord) ? '%' + searchKeyWord + '%' : '%';
    
            for(Product__c goods : [SELECT  Id, Name, ProductCode__c, ProductNameEng__c, BasePrice__c, BaseUnit__c, TaxType__c, TaxRate__c FROM Product__c 
                                            WHERE Active__c = true 
                                            AND (Name LIKE :searchFilter OR ProductCode__c LIKE :searchFilter) LIMIT 50]) 
            {
                resultList.add(new WrapperClass(goods));
            }
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
        return resultList;
    }

    public class WrapperClass {
        @AuraEnabled public String productId;
        @AuraEnabled public String productName;
        @AuraEnabled public String productUrl; 
        @AuraEnabled public String productNameEng;
        @AuraEnabled public String productCode;
        @AuraEnabled public Decimal quantity;
        @AuraEnabled public Decimal productPrice;
        @AuraEnabled public Decimal totalPrice;
        @AuraEnabled public String unit;
        @AuraEnabled public String taxType;
        @AuraEnabled public Double taxRate;
        @AuraEnabled public String color;
        @AuraEnabled public String size;
        @AuraEnabled public String material;
        @AuraEnabled public Boolean isChecked;

        public WrapperClass() {}

        public WrapperClass(Product__c record) {
            this.productId       = record.Id;
            this.productName     = record.Name;
            this.productUrl      = makeRecordURL(record.Id);
            this.productNameEng  = record.ProductNameEng__c;
            this.productCode     = record.ProductCode__c;
            this.productPrice    = record.BasePrice__c;
            this.unit            = record.BaseUnit__c;
            this.taxType         = record.TaxType__c;
            this.taxRate         = record.TaxRate__c;
            this.quantity        = null;
            this.totalPrice      = null;
            this.size            = null;
            this.material        = null;
            this.isChecked       = false;
        }

        private String makeRecordURL(Id recordId) {
            return URL.getOrgDomainURL().toExternalForm() + '/' + recordId;
        }

    }

}