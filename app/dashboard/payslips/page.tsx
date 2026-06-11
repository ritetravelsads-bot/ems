'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FileText, Download, Eye, Calendar, DollarSign } from 'lucide-react'
import { getMySalaries, generatePayslip } from '@/app/actions/salary'
import { getCurrentUser } from '@/app/actions/auth'
import { useToast } from '@/hooks/use-toast'

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const salaryFetcher = async () => {
  const result = await getMySalaries()
  return result
}

export default function PayslipsPage() {
  const { data: salaries, isLoading } = useSWR('mySalaries', salaryFetcher)
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null)
  const [payslipData, setPayslipData] = useState<any>(null)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const { toast } = useToast()

  const handleViewPayslip = async (salary: any) => {
    setSelectedPayslip(salary)
    const result = await generatePayslip(salary._id)
    if (result.success) {
      setPayslipData(result.payslip)
      setIsViewOpen(true)
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      })
    }
  }

  const handleDownloadPayslip = () => {
    if (!payslipData) return
    
    // Generate PDF-like content as HTML and trigger download
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${payslipData.month} ${payslipData.year}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .company-name { font-size: 24px; font-weight: bold; }
          .payslip-title { font-size: 18px; color: #666; margin-top: 10px; }
          .section { margin: 20px 0; }
          .section-title { font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
          .row { display: flex; justify-content: space-between; padding: 5px 0; }
          .label { color: #666; }
          .value { font-weight: 500; }
          .total-row { border-top: 2px solid #333; margin-top: 10px; padding-top: 10px; font-size: 18px; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${payslipData.companyName}</div>
          <div class="payslip-title">Payslip for ${payslipData.month} ${payslipData.year}</div>
        </div>
        
        <div class="section">
          <div class="section-title">Employee Details</div>
          <div class="row"><span class="label">Name:</span><span class="value">${payslipData.employeeName}</span></div>
          <div class="row"><span class="label">Employee Code:</span><span class="value">${payslipData.employeeCode}</span></div>
          <div class="row"><span class="label">Designation:</span><span class="value">${payslipData.designation}</span></div>
        </div>
        
        <div class="section">
          <div class="section-title">Earnings</div>
          <div class="row"><span class="label">Basic Salary:</span><span class="value">Rs. ${payslipData.basicSalary?.toLocaleString()}</span></div>
          ${payslipData.hoursWorked ? `<div class="row"><span class="label">Hours Worked:</span><span class="value">${payslipData.hoursWorked}h</span></div>` : ''}
          <div class="row"><span class="label">Gross Salary:</span><span class="value">Rs. ${payslipData.grossSalary?.toLocaleString()}</span></div>
        </div>
        
        <div class="section">
          <div class="section-title">Deductions</div>
          ${payslipData.deductions?.map((d: any) => `<div class="row"><span class="label">${d.name}:</span><span class="value">Rs. ${d.amount?.toLocaleString()}</span></div>`).join('') || '<div class="row"><span class="label">No deductions</span></div>'}
          ${payslipData.leavesDeducted ? `<div class="row"><span class="label">Leave Deduction (${payslipData.leavesDeducted} days):</span><span class="value">Rs. ${payslipData.leaveDeductionAmount?.toLocaleString()}</span></div>` : ''}
        </div>
        
        <div class="section">
          <div class="total-row row">
            <span class="label">Net Salary:</span>
            <span class="value">Rs. ${payslipData.netSalary?.toLocaleString()}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>This is a computer-generated payslip and does not require a signature.</p>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `
    
    const blob = new Blob([content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payslip-${payslipData.month}-${payslipData.year}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: 'Downloaded',
      description: 'Payslip has been downloaded'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Payslips</h1>
        <p className="text-muted-foreground">
          View and download your salary payslips
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Payslips</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salaries?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Available for download</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Latest Salary</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs. {salaries?.[0]?.netSalary?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {salaries?.[0] ? `${monthNames[salaries[0].month]} ${salaries[0].year}` : 'No records'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">YTD Earnings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs. {salaries?.filter(s => s.year === new Date().getFullYear() && s.status === 'paid')
                .reduce((sum, s) => sum + (s.netSalary || 0), 0).toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">Year to date earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Payslips Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payslip History</CardTitle>
          <CardDescription>Your salary records and payslips</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : salaries?.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">No payslips found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaries?.map((salary: any) => {
                  const totalDeductions = salary.deductions?.reduce((sum: number, d: any) => sum + d.amount, 0) || 0
                  return (
                    <TableRow key={salary._id}>
                      <TableCell className="font-medium">
                        {monthNames[salary.month]} {salary.year}
                      </TableCell>
                      <TableCell>Rs. {salary.basicSalary?.toLocaleString()}</TableCell>
                      <TableCell className="text-destructive">
                        - Rs. {totalDeductions.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-semibold">
                        Rs. {salary.netSalary?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            salary.status === 'paid' ? 'default' :
                            salary.status === 'processed' ? 'secondary' : 'outline'
                          }
                          className="capitalize"
                        >
                          {salary.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewPayslip(salary)}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Payslip Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Payslip - {payslipData?.month} {payslipData?.year}</DialogTitle>
            <DialogDescription>{payslipData?.companyName}</DialogDescription>
          </DialogHeader>
          
          {payslipData && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Employee Name</p>
                  <p className="font-medium">{payslipData.employeeName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Employee Code</p>
                  <p className="font-medium">{payslipData.employeeCode}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Designation</p>
                  <p className="font-medium">{payslipData.designation}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pay Period</p>
                  <p className="font-medium">{payslipData.month} {payslipData.year}</p>
                </div>
              </div>

              {/* Earnings */}
              <div>
                <h4 className="mb-2 font-semibold">Earnings</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Basic Salary</span>
                    <span>Rs. {payslipData.basicSalary?.toLocaleString()}</span>
                  </div>
                  {payslipData.hoursWorked && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hours Worked</span>
                      <span>{payslipData.hoursWorked}h</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Gross Salary</span>
                    <span className="font-medium">Rs. {payslipData.grossSalary?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h4 className="mb-2 font-semibold">Deductions</h4>
                <div className="space-y-2">
                  {payslipData.deductions?.map((d: any, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="text-destructive">- Rs. {d.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                  {payslipData.leavesDeducted > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Leave Deduction ({payslipData.leavesDeducted} days)</span>
                      <span className="text-destructive">- Rs. {payslipData.leaveDeductionAmount?.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Net Salary */}
              <div className="rounded-lg bg-primary p-4 text-primary-foreground">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold">Net Salary</span>
                  <span className="text-lg font-bold">Rs. {payslipData.netSalary?.toLocaleString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                  Close
                </Button>
                <Button onClick={handleDownloadPayslip}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
