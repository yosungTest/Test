public with sharing class gfUtilController {

    /**
     * PickList Field Options 만들어주는 함수
     * @param {String} pickListFiledName 
     * @param List<String>} pickListFiledName 
     * @return  `Map<String, Object>`
     * @exception 
     */
    public Map<String, Object> getPickListOptions(String objectName, List<String> pickListFieldName){
        Map<String, Object> resultMap = new Map<String, Object>();
        try {
            for(String name : pickListFieldName) {
                Schema.SObjectType objectType = Schema.getGlobalDescribe().get(objectName);
                Map<String, SObjectField> fieldMap = objectType.getDescribe().fields.getMap();
                Schema.SobjectField sObjectFiledName = fieldMap.get(name);                          
                List<SelectOption> picklistOptions = getPickListFiledValue(sObjectFiledName);
                resultMap.put(name, picklistOptions);
            }
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }

        return resultMap;
    }

    /**
     * PickList 필드들의 픽리스트 값을 가져온다.
     * @param {Schema.sObjectField} filedApiName 
     */
    public List<SelectOption> getPickListFiledValue(Schema.SObjectField filedApiName) {
        List<SelectOption> resultList = new List<SelectOption>();
        List<Schema.PicklistEntry> values = filedApiName.getDescribe().getPicklistValues();
        for(Schema.PicklistEntry sp : values){
            resultList.add(new SelectOption(sp.getLabel(), sp.getValue()));
        }
        return resultList;
    }
    
        
    /**
     * Picklist Options 생성
     */
    public inherited sharing class SelectOption {
        @AuraEnabled public String label {get; set;}
        @AuraEnabled public String value {get; set;}
        @AuraEnabled public String description {get; set;}
        @AuraEnabled public Boolean isDisabled {get; set;}

        public SelectOption(String label, String value) {
            this.label = label;
            this.value = value;
        }

        public SelectOption(String label, String value, String description) {
            this.label = label;
            this.value = value;
            this.description = description;
        }

        public SelectOption(String label, String value, String description, Boolean isDisabled) {
            this.label = label;
            this.value = value;
            this.description = description;
            this.isDisabled = isDisabled;
        }

    }
}