import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const ReportSchema = new Schema({
    report_id:{
        type: String,
        required: true
    },
    reportName:{
        type: String,
        required: true
    },
    employeeCode:{
        type: String,
        required: true
    },
    reportDate:{
        type: Date,
        required: true
    },
    reportDescription:{
        type: String,
        required: true
    },
    supportingDocument:{
        type: [String],
        required: true
    },
    view:{
        type:Boolean,
        default : false
    }
}, {
    timestamps: true        
})

ReportSchema.plugin(mongooseAggregatePaginate)
export const Report = mongoose.model('Report', ReportSchema)